import Path, { sep } from 'node:path'
import { tmpdir } from 'node:os'
import * as fs from 'node:fs/promises'
import {
  EventEmitter,
  MarkdownString,
  type TextDocumentShowOptions,
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
import { type Patch, type Unarray, isPatch } from '../types'
import { assertUnreachable, capitalizeFirstLetter, log, shortenHash } from '../utils'

const bullet = '•'

// DONE tasks
// - each Patch item in the Patches view can now be expanded
//   - shows a sub-list of the files changed in the latest Revision of that Patch when compared to the Revision base commit
//   - the files are sorted by directory first and then by filename
// - each filechange item in the list
//   - shows the filename
//   - shows the path to the filename if that Patch contains multiple changed files with the same name
//   - automatically uses the File Icon matching that file according to the user's selected File Icon Theme set in VS Code settings (if any)
// - on filechange item hover a tooltip is shown
//   - with the relative path starting from project root (including the filename)
//   - with the kind of change that this file had (e.g. `added`, `modified`, `moved`, etc)
//   - if the file was `moved` or `copied` then both the `oldPath` and `newPath` are shown with an arrow between them
// - on filechange item left-click an editor opens showing the diff between the file's version in the latest revision of that Patch and the version in that revision's base.
// - on filechange item right-click the context menu has
//   - a command to "Open Original Version" available only to items with filechange kinds "deleted" or "modified"
//   - a command to "Open Changed Version" available only to items with filechange kinds "added" or "modified"
// - the Patches view title-bar has a new "Collapse All Items in Patches View" button to the right of the refresh button
// - the Command Palette has a new command to "Collapse All Items in Patches View"
// OTHER DONE tasks
// - copy of all commands is now (consistently) in Title Case as per the VS Code UX Guidelines

// TODO tasks
// TODO: maninak update readme and changelog regarding file diff
// TODO: maninak check what happens when diffing non-text file like images
// TODO: maninak compare with master by default and with revision.base on right-click
// TODO: maninak add button to "diff against default project branch" (try to name it! e.g. master) button on fileTreeItem
// TODO: maninak if patch is not merged diff against current master (if possible), else against latestRevision.base
// TODO: maninak as first treeItem if an expanded patch show files changed `+${A} ~${M} -${D}` (colored) and/or lines changed
// TODO: maninak show lines added | removed on changefile item tooltip
// TODO: maninak show M or A or D (colored!) at the right-most side of each file treeitem signifying modified, added or deleted
// TODO: maninak add checkbox next to each item which on hover shows tooltip "Mark file as viewed". A check should be keyed to each `revision.id+file.resolvedPath`. Sync state across vscode instances. Add a config to toggle showing it.
// TODO: maninak prefix each Patch item description with `✓` (or put on the far right as icon) if branch is checked out and in tooltip with `(✓ Current Branch)`.
// TODO: maninak open the diff editor in read-only (opening a diff of an old commit via the native git plugin shows "Editor is read-only because the file system of the file is read-only." which means we could perhaps have the files in-memory instead of using temp files??! Maybe this is related https://github.com/microsoft/vscode-extension-samples/tree/69333818a412353487f0f445a80a36dcb7b6c2ab/source-control-sample or maybe a URI with custom scheme https://code.visualstudio.com/api/extension-guides/virtual-documents#textdocumentcontentprovider) or by making a Repository https://stackoverflow.com/questions/54952188/showing-differences-from-vs-code-source-control-extension/54986747#54986747
// TODO: maninak show Gravatar or stable randomly generated avatar (use the one from `radilce-interface`) on Patch list item tooltip. Prefix PR name with status e.g. `Draft •` or `[Draft]`. Add a new `radicle.patches.icon` config with options [`Status icon`, `Gr(avatar)`, `None`] https://github.com/microsoft/vscode-pull-request-github/blob/d53cc2e3f22d47cc009a686dc56f1827dda4e897/src/view/treeNodes/pullRequestNode.ts#L315
// TODO: maninak make a new ticket to create a new expandable level of all Revisions inside a Patch and outside the files list. Expanding the Patch should auto-expand the most recent revision. Expanding a revision should collapse all other revisions of a Patch. On right-click there should be an option to "Open Diff since Revision..." and show a list of all revisions of this Patch for the user to select one. On selection open diff with that as base On right-click there should be an option to "Open Changes since Commit..." and show a selection list of all commits on that revisions up until one marked "base". On selection open diff with that as base. If both of the above are implemented, then make a sublist "Open Changes since" with the above as sub-items.

export interface FilechangeNode {
  filename: string
  relativeInRepoUrl: string
  oldVersionUrl?: string
  newVersionUrl?: string
  enableShowingPathInDescription: () => void
  getTreeItem: () => ReturnType<(typeof patchesTreeDataProvider)['getTreeItem']>
}

/**
 * Event emitter dedicated to refreshing the Patch view's tree data.
 */
export const patchesRefreshEventEmitter = new EventEmitter<
  string | Patch | (string | Patch)[] | undefined
>()

export const patchesTreeDataProvider: TreeDataProvider<string | Patch | FilechangeNode> = {
  getTreeItem: (elem) => {
    if (typeof elem === 'string') {
      return { description: elem }
    } else if (isPatch(elem)) {
      const edgeRevisions = getFirstAndLatestRevisions(elem)
      const treeItem: TreeItem = {
        id: elem.id,
        contextValue: 'patch',
        iconPath: getThemeIconForPatch(elem),
        label: elem.title,
        description: getPatchTreeItemDescription(elem, edgeRevisions),
        tooltip: getPatchTreeItemTooltip(elem, edgeRevisions),
        collapsibleState: TreeItemCollapsibleState.Collapsed, // TODO: maninak restore to `Collapsed` by default except if branch is checked out
      }

      return treeItem
    }
    // elem is FilechangeNode
    else {
      // We can't put the code to construct the filechange TreeItem inside getTreeItem()
      // because we need to perform operations on the whole collection (e.g. sort, search for
      // and handle items with same filename differently, etc). Thus we define a "constructor"
      // inside getChildren() and call it in here.
      return elem.getTreeItem()
    }
  },
  getChildren: async (elem) => {
    const rid = 'rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5' // getRepoId()  // TODO: maninak restore
    // TODO: maninak validate and clean-up this duplicated `if (!rid)` check
    if (!rid) {
      // This branch should theoretically never be reached,
      // because `patches.view` has `"when": "radicle.isRadInitialized"`.
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
      const oldVersionCommitSha = latestRevision.base
      const newVersionCommitSha = latestRevision.oid

      const { data: diffResponse, error } = await fetchFromHttpd(
        `/projects/${rid}/diff/${oldVersionCommitSha}/${newVersionCommitSha}`,
      )
      if (error) {
        return ['Patch details could not be resolved due to an error!']
      }

      // create a placeholder empty file used to diff added or removed files
      const tempFileUrlPrefix = `${tmpdir()}${sep}radicle`
      const emptyFileUrl = `${tempFileUrlPrefix}${sep}empty`

      try {
        await fs.mkdir(Path.dirname(emptyFileUrl), { recursive: true })
        await fs.writeFile(emptyFileUrl, '')
      } catch (error) {
        log(
          "Failed saving placeholder empty file to enable diff for Patch's changed files.",
          'error',
          (error as Partial<Error | undefined>)?.message,
        )
      }

      type FileChangeKindWithSourceFileAvailable = keyof Pick<
        (typeof diffResponse)['diff'],
        'added' | 'deleted' | 'modified'
      >
      type FileChangeKindWithoutSourceFileAvailable = keyof Pick<
        (typeof diffResponse)['diff'],
        'copied' | 'moved'
      >
      const filechangeNodes: FilechangeNode[] = [
        ...(
          ['added', 'deleted', 'modified'] satisfies FileChangeKindWithSourceFileAvailable[]
        ).flatMap((filechangeKind) =>
          diffResponse.diff[filechangeKind].map((filechange) => {
            const fileDir = Path.dirname(filechange.path)
            const filename = Path.basename(filechange.path)

            const oldVersionUrl = `${tempFileUrlPrefix}${sep}${shortenHash(
              oldVersionCommitSha,
            )}${sep}${fileDir}${sep}${filename}`
            // TODO: maninak should the newVersionUrl be just the filechange.path (with full path to the actual file on the fs) if the current git commit is same as newVersionCommitSha and the file isn't on the git (un-)staged changes?
            const newVersionUrl = `${tempFileUrlPrefix}${sep}${shortenHash(
              newVersionCommitSha,
            )}${sep}${fileDir}${sep}${filename}`

            let shouldShowPathInDescription = false
            function enableShowingPathInDescription() {
              shouldShowPathInDescription = true
            }

            const node: FilechangeNode = {
              filename,
              relativeInRepoUrl: filechange.path,
              oldVersionUrl,
              newVersionUrl,
              enableShowingPathInDescription,
              getTreeItem: async () => {
                // TODO: maninak consider how to clean up httpd types so that infering those is easier or move them to the types file
                type AddedFileChange = Unarray<(typeof diffResponse)['diff']['added']>
                type DeletedFileChange = Unarray<(typeof diffResponse)['diff']['deleted']>
                type ModifiedFileChange = Unarray<(typeof diffResponse)['diff']['modified']>
                type FileContent = (typeof diffResponse)['files'][string]['content']

                try {
                  switch (filechangeKind) {
                    // TODO: maninak verify "deleted" works, do all other cases too and refactor!
                    case 'added':
                      await fs.mkdir(Path.dirname(newVersionUrl), {
                        recursive: true,
                      })
                      await fs.writeFile(
                        newVersionUrl,
                        diffResponse.files[(filechange as AddedFileChange).new.oid]
                          ?.content as FileContent,
                      )
                      break
                    case 'deleted':
                      await fs.mkdir(Path.dirname(oldVersionUrl), {
                        recursive: true,
                      })
                      await fs.writeFile(
                        oldVersionUrl,
                        diffResponse.files[(filechange as DeletedFileChange).old.oid]
                          ?.content as FileContent,
                      )
                      break
                    case 'modified':
                      await Promise.all([
                        fs.mkdir(Path.dirname(oldVersionUrl), { recursive: true }),
                        fs.mkdir(Path.dirname(newVersionUrl), { recursive: true }),
                      ])
                      await Promise.all([
                        fs.writeFile(
                          oldVersionUrl,
                          diffResponse.files[(filechange as ModifiedFileChange).old.oid]
                            ?.content as FileContent,
                        ),
                        fs.writeFile(
                          newVersionUrl,
                          diffResponse.files[(filechange as ModifiedFileChange).new.oid]
                            ?.content as FileContent,
                        ),
                      ])
                      break
                    default:
                      assertUnreachable(filechangeKind)
                  }
                } catch (error) {
                  log(
                    `Failed saving temp files to enable diff for ${filechange.path}.`,
                    'error',
                    (error as Partial<Error | undefined>)?.message,
                  )
                }

                const filechangeTreeItem: TreeItem = {
                  id: `${elem.id} ${oldVersionCommitSha}..${newVersionCommitSha} ${filechange.path}`,
                  contextValue: `filechange:${filechangeKind}`,
                  label: filename,
                  description: shouldShowPathInDescription ? fileDir : undefined,
                  tooltip: `${filechange.path} ${bullet} ${capitalizeFirstLetter(
                    filechangeKind,
                  )}`,
                  resourceUri: Uri.file(filechange.path),
                  command: {
                    command: 'radicle.openDiff',
                    title: `Open changes`,
                    tooltip: `Show this file's changes between its \
before-the-Patch version and its latest version committed in the Radicle Patch`,
                    arguments: [
                      Uri.file(
                        (filechange as Partial<ModifiedFileChange>).old?.oid
                          ? oldVersionUrl
                          : emptyFileUrl,
                      ),
                      Uri.file(
                        (filechange as Partial<ModifiedFileChange>).new?.oid
                          ? newVersionUrl
                          : emptyFileUrl,
                      ),
                      `${filename} (${shortenHash(oldVersionCommitSha)} ⟷ ${shortenHash(
                        newVersionCommitSha,
                      )}) ${capitalizeFirstLetter(filechangeKind)}`,
                      { preview: true } satisfies TextDocumentShowOptions,
                    ],
                  },
                }

                return filechangeTreeItem
              },
            }

            return node
          }),
        ),
        ...(['copied', 'moved'] satisfies FileChangeKindWithoutSourceFileAvailable[]).flatMap(
          (filechangeKind) =>
            diffResponse.diff[filechangeKind].map((filechange) => {
              const filename = Path.basename(filechange.newPath)

              let shouldShowPathInDescription = false
              function enableShowingPathInDescription() {
                shouldShowPathInDescription = true
              }

              const node: FilechangeNode = {
                filename,
                relativeInRepoUrl: filechange.newPath,
                enableShowingPathInDescription,
                getTreeItem: () =>
                  ({
                    id: `${elem.id} ${oldVersionCommitSha}..${newVersionCommitSha} ${filechange.newPath}`,
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
        .sort((n1, n2) => n1.relativeInRepoUrl.localeCompare(n2.relativeInRepoUrl))

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
