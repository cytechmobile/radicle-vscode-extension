import {
  EventEmitter,
  MarkdownString,
  ThemeColor,
  ThemeIcon,
  type TreeDataProvider,
  type TreeItem,
} from 'vscode'
import TimeAgo, { type FormatStyleName } from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import { type Patch, fetchFromHttpd } from '../helpers'
import { assertUnreachable, capitalizeFirstLetter, shortenHash } from '../utils'

/**
 * Event emitter dedicated to refreshing the Patch view's tree data.
 */
export const patchesRefreshEventEmitter = new EventEmitter<
  string | Patch | (string | Patch)[] | undefined
>()

// TODO: maninak report what's done
// - new Patches view lists all patches of all statuses
//   - view will only be shown if repo is rad-initialized
//   - each item shows revision title, relative time since latest revision, author
//   of latest revision, abbreviated hash of patchId
//   - list items are sorted by patch status (first sorting level) and
//     subsequently by latest revision date (most recent first)
// - indicates to the user when no patches were found or a request failed
// - loading indicator while fetching and preparing to render items
// - a button to refresh the list of patches is shown on hover of the Patches view title
// - a command to refresh the list of patches is added to VS Code's Command Palette
// - a button to copy the patch id to clipboard is shown on list-item hover
// - an option to copy the patch id to clipboard is shown on list-item right click
// - when the http api endpoint config in the settings changes the patches automatically
//   re-fetched
// - on list item hover, a tooltip with plenty more info is shown
//   - tooltip supports HTML too
//   - any html gets sanitized for security before rendered ([see allowed tags](https://github.com/microsoft/vscode/blob/6d2920473c6f13759c978dd89104c4270a83422d/src/vs/base/browser/markdownRenderer.ts#L296)).
//   - will additionally show "Last Revised by ${alias} on ${date}" if the revision commit
//     repo rad-initialized)is different than the creation commit
//   - shows localized date format including relative "time ago" (e.g. 2 days ago)
//   - patch status is denoted by dedicated icon _and_ color (both, relying just on color only
//     is bad UX!)
// - improve copy of http-connection-error notification's button
// - when opening the Settings UI focused at a specific config, the correct scope,
//   `User` or `Workspace`, will be automatically selected based on which is actually
//   being evaluated as the result.
// - make available options during onboarding's troubleshooting flow easier to select
//   at a glance

// TODO: use global state management (pinia) to map dependencies and effects of changing
export const patchesTreeDataProvider: TreeDataProvider<Patch | string> = {
  getTreeItem: (elem) => {
    if (typeof elem === 'string') {
      return { description: elem }
    }

    const icon = getThemeIconForPatch(elem)

    const bullet = '•'
    const emDash = '—'
    const lineBreak = '\n\n'
    const sectionDivider = `${lineBreak}-----${lineBreak}`

    const revisionsSortedEarliestFirst = [...elem.revisions].sort(
      (p1, p2) => p1.timestamp - p2.timestamp,
    )
    const firstRevision = revisionsSortedEarliestFirst[0] as Exclude<
      (typeof elem.revisions)[number],
      undefined
    >
    const latestRevision = revisionsSortedEarliestFirst.at(-1) as Exclude<
      (typeof elem.revisions)[number],
      undefined
    >

    const label = elem.title

    const description = `${getTimeAgo(
      latestRevision.timestamp,
      'mini-minute-now',
    )} ${bullet} ${latestRevision.author.alias} ${bullet} ${shortenHash(elem.id)}`

    /**
     * Gives special markdown formatting to a string value, further indicating that
     * it is data received from the API and not fixed tooltip copy.
     */
    function dat(str: string): string {
      const formatingMarker = '_'

      return `${formatingMarker}${str}${formatingMarker}`
    }

    const topSection = [
      `${getHtmlIconForPatch(elem)} ${dat(
        capitalizeFirstLetter(elem.state.status),
      )} ${emDash} ${dat(elem.id)}`,
    ].join(lineBreak)

    const middleSection = [
      `**${elem.title}**`,
      `${firstRevision.description}`,
      `${elem.labels.reduce(
        (joinedLabels, label) => `${joinedLabels}${joinedLabels ? ' ' : ''}\`${label}\``,
        '',
      )}`,
    ].join(lineBreak)
    const bottomSection = [
      ...(elem.revisions.length > 1
        ? [
            `Last revised by ${dat(latestRevision.author.alias)} on ${dat(
              getFormattedDate(latestRevision.timestamp),
            )} ${dat(`(${getTimeAgo(latestRevision.timestamp)})`)}`,
          ]
        : []),
      `Created by ${dat(elem.author.alias)} on ${dat(
        getFormattedDate(firstRevision.timestamp),
      )} ${dat(`(${getTimeAgo(firstRevision.timestamp)})`)}`,
    ].join(lineBreak)

    const tooltip = new MarkdownString(
      [topSection, middleSection, bottomSection].join(sectionDivider),
      true,
    )
    tooltip.supportHtml = true

    const treeItem = {
      id: elem.id,
      iconPath: icon,
      label,
      description,
      tooltip,
      contextValue: 'patch',
    } satisfies TreeItem

    return treeItem
  },
  getChildren: async (el) => {
    if (!el) {
      const rid = 'rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5' // getRepoId()  // TODO: maninak restore
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

    return undefined
  },
  onDidChangeTreeData: patchesRefreshEventEmitter.event,
} as const

function getPatchesOfStatusSortedByLatestRevisionFirst(
  patches: Patch[],
  patchStatus: Patch['state']['status'],
): Patch[] {
  const sortedPatches = patches
    .filter((patch) => patch.state.status === patchStatus)
    .sort((p1, p2) => {
      const p1RevisionsSorted = [...p1.revisions].sort((p1, p2) => p1.timestamp - p2.timestamp)
      const p2RevisionsSorted = [...p2.revisions].sort((p1, p2) => p1.timestamp - p2.timestamp)
      const latestP1Revision = p1RevisionsSorted.at(-1) as Exclude<
        Patch['revisions'][number],
        undefined
      >
      const latestP2Revision = p2RevisionsSorted.at(-1) as Exclude<
        Patch['revisions'][number],
        undefined
      >

      return latestP2Revision.timestamp - latestP1Revision.timestamp
    })

  return sortedPatches
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