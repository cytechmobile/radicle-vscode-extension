import Path from 'node:path'
import {
  EventEmitter,
  MarkdownString,
  ThemeColor,
  ThemeIcon,
  type TreeDataProvider,
  type TreeItem,
  TreeItemCollapsibleState,
  Uri,
} from 'vscode'
import TimeAgo, { type FormatStyleName } from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import { fetchFromHttpd } from '../helpers'
import { type Patch, isPatch } from '../types'
import { assertUnreachable, capitalizeFirstLetter, shortenHash } from '../utils'

const bullet = '•'

// DONE tasks
// - each Patch item in the Patches list can now be expanded
//   - shows a sub-list of the files changed in the latest Revision of that Patch when compared to the Revision base commit
//   - the files are sorted by directory first and then by filename
// - each file item in the sub-list of files
//   - shows the filename
//   - shows the path to the filename if that changeset contains multiple files with the same name
//   - automatically uses the File Icon matching that file according to the user's selected File Icon Theme in VS Code settings (if any)
// - on file item hove a tooltip is shown
//   - with the relative path starting from project root (including the filename)
//   - with the kind of change that this file had (e.g. `added`, `modified`, `moved`, etc)
//   - if the file was `moved` or `copied` then both the `oldPath` and `newPath` are shown with an arrow between them

// TODO tasks
// TODO: maninak add a "collapse all" button on the right of the refresh button
// TODO: maninak as first treeItem if an expanded patch show files changed `+${A} ~${M} -${D}` (colored) and/or lines changed
// TODO: maninak show `+${A} ~${M} -${D}` (colored) on the tooltip of each Patch treeitem
// TODO: maninak show M or A or D (colored!) at the right-most side of each file treeitem signifying modified, added or deleted
// TODO: maninak add checkbox next to each item which on hover shows tooltip "Mark file as viewed". A check should be keyed to each `revision.id+file.resolvedPath`. Sync state across vscode instances.
// TODO: maninak prefix each Patch item description with `✓` (or put on the far right as icon) if branch is checked out and in tooltip with `(✓ Current Branch)`.
// TODO: maninak add button to "diff against default project branch" (try to name it! e.g. master) button on fileTreeItem
// TODO: maninak if patch is not merged diff against current master (if possible), else against latestRevision.base
// TODO: maninak show Gravatar or stable randomly generated avatar (use the one from `radilce-interface`) on Patch list item tooltip. Prefix PR name with status e.g. `Draft:`. Add a new `radicle.patches.icon` config with options [`Status icon`, `Gr(avatar)`, `None`] https://github.com/microsoft/vscode-pull-request-github/blob/d53cc2e3f22d47cc009a686dc56f1827dda4e897/src/view/treeNodes/pullRequestNode.ts#L315
// TODO: maninak add button to `Open Modified File`
// TODO: maninak add button when holding `alt` to `Open Modified File to the Side`
// TODO: maninak add command on right click to "Open Modified File"
// TODO: maninak add command on right click to "Open Original File"
// TODO: maninak make a new ticket to create a new expandable level of all Revisions inside a Patch and outside the files list. Expanding the Patch should auto-expand the most recent revision. Expanding a revision should collapse all other revisions of a Patch. On right-click there should be an option to "Open Diff since Revision..." and show a list of all revisions of this Patch for the user to select one. On selection open diff with that as base On right-click there should be an option to "Open Changes since Commit..." and show a selection list of all commits on that revisions up until one marked "base". On selection open diff with that as base. If both of the above are implemented, then make a sublist "Open Changes since" with the above as sub-items.

/**
 * Event emitter dedicated to refreshing the Patch view's tree data.
 */
export const patchesRefreshEventEmitter = new EventEmitter<
  string | Patch | (string | Patch)[] | undefined
>()

interface FilechangeNode {
  resolvedPath: string
  filename: string
  enableShowingPathInDescription: () => void
  getTreeItem: () => TreeItem
}

export const patchesTreeDataProvider: TreeDataProvider<string | Patch | FilechangeNode> = {
  getTreeItem: (elem) => {
    if (typeof elem === 'string') {
      return { description: elem }
    } else if (isPatch(elem)) {
      const edgeRevisions = getFirstAndLatestRevisions(elem)
      const treeItem: TreeItem = {
        id: elem.id,
        iconPath: getThemeIconForPatch(elem),
        label: elem.title,
        description: getPatchTreeItemDescription(elem, edgeRevisions),
        tooltip: getPatchTreeItemTooltip(elem, edgeRevisions),
        contextValue: 'patch',
        collapsibleState: TreeItemCollapsibleState.Expanded, // TODO: maninak restore to `Collapsed` by default except if branch is checked out
      }

      return treeItem
    }
    // elem is FilechangeNode
    else {
      return elem.getTreeItem()
    }
  },
  getChildren: async (elem) => {
    const rid = 'rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5' // getRepoId()  // TODO: maninak restore
    if (!rid) {
      // this branch should theoretically never be reached
      // because `patches.view` has `"when": "radicle.isRadInitialized"`
      return ['Unable to fetch Radicle Patches for non-Radicle-initialized workspace']
    }

    // get children of root
    if (!elem) {
      if (!rid) {
        // this branch should theoretically never be reached
        // because `patches.view` has `"when": "radicle.isRadInitialized"`
        return ['Unable to fetch Radicle Patches for Radicle-initialized workspace']
      }

      // TODO: refactor to make only a single request when https://radicle.zulipchat.com/#narrow/stream/369873-support/topic/fetch.20all.20patches.20in.20one.20req is resolved
      const responses = await Promise.all([
        fetchFromHttpd(`/projects/${rid}/patches`, 'GET', undefined, {
          query: { state: 'draft' },
        }),
        fetchFromHttpd(`/projects/${rid}/patches`, 'GET', undefined, {
          query: { state: 'open' },
        }),
        fetchFromHttpd(`/projects/${rid}/patches`, 'GET', undefined, {
          query: { state: 'archived' },
        }),
        fetchFromHttpd(`/projects/${rid}/patches`, 'GET', undefined, {
          query: { state: 'merged' },
        }),
      ])
      const errorOccured = Boolean(responses.find((response) => response.error))
      const patches = responses.flatMap((response) => response.data).filter(Boolean)

      if (errorOccured) {
        return ['Not all patches may be listed due to an error!', ...patches]
      }
      if (!patches.length) {
        return [`0 Radicle Patches found`]
      }

      const patchesSortedByRevisionTsPerStatus = [
        ...getPatchesOfStatusSortedByLatestRevisionFirst(patches, 'draft'),
        ...getPatchesOfStatusSortedByLatestRevisionFirst(patches, 'open'),
        ...getPatchesOfStatusSortedByLatestRevisionFirst(patches, 'archived'),
        ...getPatchesOfStatusSortedByLatestRevisionFirst(patches, 'merged'),
      ]

      return patchesSortedByRevisionTsPerStatus
    }

    // get children of patch
    else if (isPatch(elem)) {
      const { latestRevision } = getFirstAndLatestRevisions(elem)
      const { data, error } = await fetchFromHttpd(
        `/projects/${rid}/diff/${latestRevision.base}/${latestRevision.oid}`,
      )

      if (error) {
        return ['Patch details could not be resolved due to an error!']
      }

      const filechangeNodes: FilechangeNode[] = [
        ...(['added', 'deleted', 'modified'] as const).flatMap((filechangeKind) =>
          data.diff[filechangeKind].map((filechange) => {
            const filename = Path.basename(filechange.path)

            let shouldShowPathInDescription = false
            function enableShowingPathInDescription() {
              shouldShowPathInDescription = true
            }

            const node: FilechangeNode = {
              resolvedPath: filechange.path,
              filename,
              enableShowingPathInDescription,
              getTreeItem: () =>
                ({
                  id: `${elem.id} ${latestRevision.base}..${latestRevision.oid} ${filechange.path}`,
                  label: filename,
                  description: shouldShowPathInDescription
                    ? Path.dirname(filechange.path)
                    : undefined,
                  tooltip: `${filechange.path} ${bullet} ${capitalizeFirstLetter(
                    filechangeKind,
                  )}`,
                  resourceUri: Uri.file(filechange.path),
                } satisfies TreeItem),
            }

            return node
          }),
        ),
        ...(['copied', 'moved'] as const).flatMap((filechangeKind) =>
          data.diff[filechangeKind].map((filechange) => {
            const filename = Path.basename(filechange.newPath)

            let shouldShowPathInDescription = false
            function enableShowingPathInDescription() {
              shouldShowPathInDescription = true
            }

            const node: FilechangeNode = {
              resolvedPath: filechange.newPath,
              filename,
              enableShowingPathInDescription,
              getTreeItem: () =>
                ({
                  id: `${elem.id} ${latestRevision.base}..${latestRevision.oid} ${filechange.newPath}`,
                  label: filename,
                  description: shouldShowPathInDescription
                    ? Path.dirname(filechange.newPath)
                    : undefined,
                  tooltip: `${filechange.oldPath} ➟ ${
                    filechange.newPath
                  } ${bullet} ${capitalizeFirstLetter(filechangeKind)}`,
                  resourceUri: Uri.file(filechange.newPath),
                } satisfies TreeItem),
            }

            return node
          }),
        ),
      ]
        .map((filechangeNode, _, nodes) => {
          const nodesExcludingFileChangeNode = nodes.filter((node) => node !== filechangeNode)
          const hasSameFilenameWithAnotherFile = Boolean(
            nodesExcludingFileChangeNode.find(
              (node) => node.filename === filechangeNode.filename,
            ),
          )

          hasSameFilenameWithAnotherFile && filechangeNode.enableShowingPathInDescription()

          return filechangeNode
        })
        .sort((n1, n2) => n1.resolvedPath.localeCompare(n2.resolvedPath))

      return filechangeNodes
    }

    return undefined
  },
  onDidChangeTreeData: patchesRefreshEventEmitter.event,
} as const

function getPatchTreeItemDescription(
  patch: Patch,
  { latestRevision }: ReturnType<typeof getFirstAndLatestRevisions>,
) {
  const description = `${getTimeAgo(latestRevision.timestamp, 'mini-minute-now')} ${bullet} ${
    latestRevision.author.alias
  } ${bullet} ${shortenHash(patch.id)}`

  return description
}

function getPatchTreeItemTooltip(
  patch: Patch,
  { firstRevision, latestRevision }: ReturnType<typeof getFirstAndLatestRevisions>,
) {
  const emDash = '—'
  const lineBreak = '\n\n'
  const sectionDivider = `${lineBreak}-----${lineBreak}`

  const tooltipTopSection = [
    `${getHtmlIconForPatch(patch)} ${dat(
      capitalizeFirstLetter(patch.state.status),
    )} ${emDash} ${dat(patch.id)}`,
  ].join(lineBreak)

  const tooltipMiddleSection = [
    `**${patch.title}**`,
    `${firstRevision.description}`,
    `${patch.labels.reduce(
      (joinedLabels, label) => `${joinedLabels}${joinedLabels ? ' ' : ''}\`${label}\``,
      '',
    )}`,
  ].join(lineBreak)

  const tooltipBottomSection = [
    ...(patch.revisions.length > 1
      ? [
          `Last revised by ${dat(latestRevision.author.alias)} on ${dat(
            getFormattedDate(latestRevision.timestamp),
          )} ${dat(`(${getTimeAgo(latestRevision.timestamp)})`)}`,
        ]
      : []),
    `Created by ${dat(patch.author.alias)} on ${dat(
      getFormattedDate(firstRevision.timestamp),
    )} ${dat(`(${getTimeAgo(firstRevision.timestamp)})`)}`,
  ].join(lineBreak)

  const tooltip = new MarkdownString(
    [tooltipTopSection, tooltipMiddleSection, tooltipBottomSection].join(sectionDivider),
    true,
  )
  tooltip.supportHtml = true

  return tooltip
}

/**
 * Gives special Markdown formatting to a string value, further indicating that
 * it is data received from the API and not fixed tooltip copy.
 */
function dat(str: string): string {
  const formatingMarker = '_'

  return `${formatingMarker}${str}${formatingMarker}`
}

function getPatchesOfStatusSortedByLatestRevisionFirst(
  patches: Patch[],
  patchStatus: Patch['state']['status'],
): Patch[] {
  const sortedPatches = patches
    .filter((patch) => patch.state.status === patchStatus)
    .sort((p1, p2) => {
      const { latestRevision: latestP1Revision } = getFirstAndLatestRevisions(p1)
      const { latestRevision: latestP2Revision } = getFirstAndLatestRevisions(p2)

      return latestP2Revision.timestamp - latestP1Revision.timestamp
    })

  return sortedPatches
}

function getFirstAndLatestRevisions(patch: Patch) {
  const revisionsSortedOldestFirst = [...patch.revisions].sort(
    (p1, p2) => p1.timestamp - p2.timestamp,
  )
  const firstRevision = revisionsSortedOldestFirst[0] as Exclude<
    (typeof patch.revisions)[number],
    undefined
  >
  const latestRevision = revisionsSortedOldestFirst.at(-1) as Exclude<
    (typeof patch.revisions)[number],
    undefined
  >

  return { firstRevision, latestRevision }
}

// eslint-disable-next-line consistent-return
function getThemeIconForPatch(patch: Patch): ThemeIcon {
  switch (patch.state.status) {
    case 'draft':
      return new ThemeIcon('git-pull-request-draft', new ThemeColor('patch.draft'))
    case 'open':
      return new ThemeIcon('git-pull-request', new ThemeColor('patch.open'))
    case 'archived':
      return new ThemeIcon('git-pull-request-closed', new ThemeColor('patch.archived'))
    case 'merged':
      return new ThemeIcon('merge', new ThemeColor('patch.merged'))
    default:
      assertUnreachable(patch.state.status)
  }
}

function getHtmlIconForPatch(patch: Patch): string {
  const icon = getThemeIconForPatch(patch)

  return `<span style="color:${getCssColor(icon.color)};">$(${icon.id})</span>`
}

function getCssColor(themeColor: ThemeColor | undefined): string {
  // @ts-expect-error id is set as private but there's no other API currently https://github.com/microsoft/vscode/issues/34411#issuecomment-329741042
  return `var(--vscode-${(themeColor.id as string).replace('.', '-')})`
}

function getFormattedDate(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    year: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
}

TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

function getTimeAgo(unixTimestamp: number, style: FormatStyleName = 'round-minute'): string {
  return timeAgo.format(unixTimestamp * 1000, style)
}
