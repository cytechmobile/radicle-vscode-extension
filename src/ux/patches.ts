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
import { fetchFromHttpd, getRepoId } from '../helpers'
import { type Patch, type Unarray, isPatch } from '../types'
import { assertUnreachable, capitalizeFirstLetter, log, shortenHash } from '../utils'

const bullet = '•'

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
        collapsibleState: TreeItemCollapsibleState.Collapsed,
      }

      return treeItem
    }
    // elem is FilechangeNode
    else {
      // We can't put the code to construct the filechange TreeItem inside getTreeItem()
      // because we need to perform operations on the whole collection (e.g. sort, search for
      // and handle items with same filename differently, etc). Thus we define a "constructor"
      // inside getChildren() and call that in here.
      return elem.getTreeItem()
    }
  },
  getChildren: async (elem) => {
    const rid = getRepoId()
    if (!rid) {
      // This trap should theoretically never be reached,
      // because `patches.view` has `"when": "radicle.isRadInitialized"`.
      return ['Unable to fetch Radicle Patches for non-Radicle-initialized workspace']
    }

    // get children of root
    if (!elem) {
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
                  description: shouldShowPathInDescription ? true : undefined,
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

      return filechangeNodes.length
        ? filechangeNodes
        : [
            `No changes between latest revision's base "${shortenHash(
              latestRevision.base,
            )}" and head "${shortenHash(latestRevision.oid)}"`,
          ]
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
      return new ThemeIcon('git-merge', new ThemeColor('patch.merged'))
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
