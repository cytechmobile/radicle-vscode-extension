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
import { type AugmentedPatch, usePatchStore } from '../stores'
import {
  debouncedClearMemoizedGetCurrentProjectIdCache,
  fetchFromHttpd,
  memoizedGetCurrentProjectId,
} from '../helpers'
import { type Patch, type Unarray, isPatch } from '../types'
import {
  assertUnreachable,
  capitalizeFirstLetter,
  getFirstAndLatestRevisions,
  getIdentityAliasOrId,
  getTimeAgo,
  log,
  shortenHash,
} from '../utils'

const dot = '·'
const checkmark = '✓'

let timesPatchListFetchErroredConsecutively = 0

// TODO: maninak show in item and tooltip if the chosen revision is approved, by whom and when

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
const rerenderPatchesViewEventEmitter = new EventEmitter<
  string | AugmentedPatch | (string | AugmentedPatch)[] | undefined
>()

export function rerenderSomeItemsInPatchesView(
  patchesMatchingItems: AugmentedPatch | AugmentedPatch[],
) {
  rerenderPatchesViewEventEmitter.fire(patchesMatchingItems)
}

export function rerenderAllItemsInPatchesView() {
  rerenderPatchesViewEventEmitter.fire(undefined)
}

export const patchesTreeDataProvider: TreeDataProvider<
  string | AugmentedPatch | FilechangeNode
> = {
  getTreeItem: (elem) => {
    if (typeof elem === 'string') {
      return { description: elem }
    } else if (isPatch(elem)) {
      const patch = elem
      const isCheckedOut = patch.id === usePatchStore().checkedOutPatch?.id
      const edgeRevisions = getFirstAndLatestRevisions(patch)

      const treeItem: TreeItem = {
        id: patch.id,
        contextValue: `patch:checked-out-${isCheckedOut}`,
        iconPath: getThemeIconForPatch(patch),
        label: `${isCheckedOut ? `❬${checkmark}❭ ` : ''}${patch.title}`,
        description: getPatchTreeItemDescription(patch, edgeRevisions),
        tooltip: getPatchTreeItemTooltip(patch, edgeRevisions, isCheckedOut),
        collapsibleState: TreeItemCollapsibleState.Collapsed,
      }

      return treeItem
    } else {
      const filechangeNode = elem

      // We can't put the code to construct the filechange TreeItem inside getTreeItem()
      // because we need to perform operations on the whole collection (e.g. sort, search for
      // and handle items with same filename differently, etc). Thus we define a "constructor"
      // inside getChildren() and call that in here.
      return filechangeNode.getTreeItem()
    }
  },
  getChildren: async (elem) => {
    debouncedClearMemoizedGetCurrentProjectIdCache()
    const rid = memoizedGetCurrentProjectId()
    if (!rid) {
      // This trap should theoretically never be reached,
      // because `patches.view` has `"when": "radicle.isRadInitialized"`.
      return ['Unable to fetch Radicle Patches for non-Radicle-initialized workspace']
    }

    // get children of root
    if (!elem) {
      const patchStore = usePatchStore()
      await patchStore.initStoreIfNeeded()
      const patches = patchStore.patches

      if (!patches) {
        setTimeout(() => {
          rerenderAllItemsInPatchesView()
        }, 3_000 * ++timesPatchListFetchErroredConsecutively)

        // TODO: maninak add button linking to see output?
        // TODO: maninak add button linking to specific config?
        return ['Please ensure `radicle-httpd` is running and accessible!']
      }
      timesPatchListFetchErroredConsecutively = 0

      if (!patches.length) {
        return [`0 Radicle Patches`]
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
      const patch = elem
      const { latestRevision } = getFirstAndLatestRevisions(patch)
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
            // TODO: should the newVersionUrl be just the filechange.path (with full path to the actual file on the fs) if the current git commit is same as newVersionCommitSha and the file isn't on the git (un-)staged changes?
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
                // TODO: consider how to clean up httpd types so that infering those is easier or move them to the types file
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
                  id: `${patch.id} ${oldVersionCommitSha}..${newVersionCommitSha} ${filechange.path}`,
                  contextValue: `filechange:${filechangeKind}`,
                  label: filename,
                  description: shouldShowPathInDescription ? true : undefined,
                  tooltip: `${filechange.path} ${dot} ${capitalizeFirstLetter(
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
                    id: `${patch.id} ${oldVersionCommitSha}..${newVersionCommitSha} ${filechange.newPath}`,
                    label: filename,
                    description: shouldShowPathInDescription
                      ? Path.dirname(filechange.newPath)
                      : undefined,
                    tooltip: `${filechange.oldPath} ➟ ${
                      filechange.newPath
                    } ${dot} ${capitalizeFirstLetter(filechangeKind)}`,
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

          // TODO: maninak always show path except if in project root
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
  onDidChangeTreeData: rerenderPatchesViewEventEmitter.event,
} as const

function getPatchTreeItemDescription(
  patch: Patch,
  { latestRevision }: ReturnType<typeof getFirstAndLatestRevisions>,
) {
  const merge = patch.merges.at(-1)
  const description = `${getTimeAgo(
    merge?.timestamp ?? latestRevision.timestamp,
    'mini',
  )} ${dot} ${getIdentityAliasOrId(
    merge?.author ?? latestRevision.author,
  )} ${dot} ${shortenHash(patch.id)}`

  return description
}

function getPatchTreeItemTooltip(
  patch: Patch,
  { firstRevision, latestRevision }: ReturnType<typeof getFirstAndLatestRevisions>,
  isCheckedOut: boolean,
) {
  const separator = '—'
  const lineBreak = '\n\n'
  const sectionDivider = `${lineBreak}-----${lineBreak}`

  const checkedOutIndicator = isCheckedOut ? dat(`${separator} ${checkmark} Checked out`) : ''
  const latestMerge = [...patch.merges].sort((m1, m2) => m1.timestamp - m2.timestamp).at(-1)
  const shouldShowRevisionEvent = patch.revisions.length >= 2 // more than the initial Revision

  const tooltipTopSection = [
    `${getHtmlIconForPatch(patch)} ${dat(
      capitalizeFirstLetter(patch.state.status),
    )} ${separator} ${dat(patch.id)} ${checkedOutIndicator}`,
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
    ...(latestMerge
      ? [
          `Merged by ${dat(getIdentityAliasOrId(latestMerge.author))} using revision ${dat(
            shortenHash(latestMerge.revision),
          )}${
            !shouldShowRevisionEvent
              ? ` at commit ${dat(shortenHash(latestMerge.commit))} `
              : ' '
          }${dat(`${getTimeAgo(latestMerge.timestamp)}`)}`,
        ]
      : []),
    ...(shouldShowRevisionEvent
      ? [
          `Last updated by ${dat(
            getIdentityAliasOrId(latestRevision.author),
          )} with revision ${dat(shortenHash(latestRevision.id))} at commit ${dat(
            shortenHash(latestRevision.oid),
          )} ${dat(`${getTimeAgo(latestRevision.timestamp)}`)}`,
        ]
      : []),
    `Created by ${dat(getIdentityAliasOrId(patch.author))} ${dat(
      `${getTimeAgo(firstRevision.timestamp)}`,
    )}`,
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

function getPatchesOfStatusSortedByLatestRevisionFirst<P extends Patch>(
  patches: P[],
  patchStatus: P['state']['status'],
): P[] {
  const sortedPatches = patches
    .filter((patch) => patch.state.status === patchStatus)
    .sort((p1, p2) => {
      const { latestRevision: latestP1Revision } = getFirstAndLatestRevisions(p1)
      const { latestRevision: latestP2Revision } = getFirstAndLatestRevisions(p2)

      return (
        (p2.merges.at(-1)?.timestamp ?? latestP2Revision.timestamp) -
        (p1.merges.at(-1)?.timestamp ?? latestP1Revision.timestamp)
      )
    })

  return sortedPatches
}

// eslint-disable-next-line consistent-return
function getThemeIconForPatch<P extends Patch>(patch: P): ThemeIcon {
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
      assertUnreachable(patch.state)
  }
}

function getHtmlIconForPatch<P extends Patch>(patch: P): string {
  const icon = getThemeIconForPatch(patch)

  return `<span style="color:${getCssColor(icon.color)};">$(${icon.id})</span>`
}

function getCssColor(themeColor: ThemeColor | undefined): string {
  // @ts-expect-error id is set as private but there's no other API currently https://github.com/microsoft/vscode/issues/34411#issuecomment-329741042
  return `var(--vscode-${(themeColor.id as string).replace('.', '-')})`
}
