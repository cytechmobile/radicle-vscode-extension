import Path from 'node:path'
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
import { usePatchStore } from '../stores'
import {
  debouncedClearMemoizedGetCurrentProjectIdCache,
  memoizedGetCurrentProjectId,
} from '../helpers'
import {
  type AugmentedPatch,
  type Change,
  type GitExtensionAPI,
  type Patch,
  isPatch,
} from '../types'
import {
  assertUnreachable,
  capitalizeFirstLetter,
  getFirstAndLatestRevisions,
  getGitExtensionAPI,
  getIdentityAliasOrId,
  getRepoRoot,
  getTimeAgo,
  gitExtensionStatusToInternalFileChangeState,
  shortenHash,
} from '../utils'

const dot = '·'
const checkmark = '✓'

let timesPatchListFetchErroredConsecutively = 0

// TODO: maninak show in item and tooltip if the chosen revision is approved, by whom and when

export interface FilechangeNode {
  relativeInRepoUrl: string
  oldVersionUri?: Uri
  newVersionUri?: Uri
  patch: AugmentedPatch
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
        return undefined
      }

      const patchesSortedByRevisionTsPerStatus = [
        ...getPatchesOfStatusSortedByLatestRevisionFirst(patches, 'draft'),
        ...getPatchesOfStatusSortedByLatestRevisionFirst(patches, 'open'),
        ...getPatchesOfStatusSortedByLatestRevisionFirst(patches, 'archived'),
        ...getPatchesOfStatusSortedByLatestRevisionFirst(patches, 'merged'),
      ]

      return patchesSortedByRevisionTsPerStatus
    }

    if (!isPatch(elem)) {
      return undefined
    }

    const patch = elem
    const { latestRevision } = getFirstAndLatestRevisions(patch)
    const range = {
      old: latestRevision.base,
      new: latestRevision.oid,
    }

    const gitExtensionApi: GitExtensionAPI = getGitExtensionAPI()

    const repoRoot = getRepoRoot()
    if (repoRoot === undefined) {
      throw new Error(`Failed to determine Git repository root.`)
    }

    const repo = gitExtensionApi.getRepository(Uri.file(repoRoot))
    if (repo === null) {
      throw new Error(`Failed access Git repository.`)
    }

    const changes: Change[] = await repo?.diffBetween(range.old, range.new)
    if (changes.length === 0) {
      return [
        `No changes between latest revision's base "${shortenHash(
          latestRevision.base,
        )}" and head "${shortenHash(latestRevision.oid)}" commits.`,
      ]
    }

    return changes
      .map((change: Change): FilechangeNode => {
        const { originalUri, status } = change
        const uri = change.renameUri || change.uri
        const internalFileChangeState = gitExtensionStatusToInternalFileChangeState(status)
        const isCopy = internalFileChangeState === 'copied'
        const isMoveOrCopy = isCopy || internalFileChangeState === 'moved'
        const humanReadable = capitalizeFirstLetter(internalFileChangeState)
        const basename = Path.basename(uri.fsPath)
        const git = {
          originalUri: gitExtensionApi.toGitUri(originalUri, range.old),
          uri: gitExtensionApi.toGitUri(uri, range.new),
        }
        const relative = {
          originalUri: Path.relative(repoRoot, originalUri.fsPath),
          uri: Path.relative(repoRoot, uri.fsPath),
        }
        const relativeDirname = Path.dirname(relative.uri)

        return {
          relativeInRepoUrl: relative.uri,
          oldVersionUri: git.originalUri,
          newVersionUri: git.uri,
          patch,
          getTreeItem: () => {
            const filechangeTreeItem: TreeItem = {
              id: `${patch.id} ${range.old}..${range.new} ${uri}`,
              contextValue: `filechange:${internalFileChangeState}`,
              label: basename,
              description: relativeDirname === '.' ? '' : relativeDirname,
              tooltip: `${
                isMoveOrCopy ? `${relative.originalUri} ${isCopy ? '↦' : '➟'} ` : ''
              }${relative.uri} ${dot} ${humanReadable}`,
              resourceUri: uri,
              command: {
                command: 'radicle.openDiff',
                title: `Open changes`,
                tooltip: `Show this file's changes between its \
before-the-Patch version and its latest version committed in the Radicle Patch`,
                arguments: [
                  git.originalUri,
                  git.uri,
                  `${basename} (${shortenHash(range.old)} ⟷ ${shortenHash(
                    range.new,
                  )}) ${humanReadable}`,
                  { preview: true } satisfies TextDocumentShowOptions,
                ],
              },
            }

            return filechangeTreeItem
          },
        }
      })
      .sort((n1, n2) =>
        // FIXME(lorenzleutgeb): Use user's locale for comparison once cytechmobile/radicle-vscode-extension#116 is resolved.
        n1.relativeInRepoUrl.localeCompare(n2.relativeInRepoUrl),
      )
  },
  getParent: (elem) => {
    if (typeof elem === 'string' || isPatch(elem)) {
      return undefined
    } else {
      return elem.patch
    }
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
