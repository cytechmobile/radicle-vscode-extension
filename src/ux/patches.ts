import {
  EventEmitter,
  MarkdownString,
  ThemeColor,
  ThemeIcon,
  type TreeDataProvider,
  type TreeItem,
} from 'vscode'
import { type Patch, fetchFromHttpd } from '../helpers'
import { assertUnreachable, capitalizeFirstLetter, shortenHash } from '../utils'

/**
 * Event emitter dedicated to refreshing the Patch view's tree data.
 */
export const patchesRefreshEventEmitter = new EventEmitter<
  string | Patch | (string | Patch)[] | undefined
>()

// TODO: maninak report what's done
// - new Patches view lists all patches of all statuses (will only be shown if
//   repo rad-initialized)
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
//   - shows localized date format
//   - patch status is denoted by dedicated icon + color (both, relying just on color only
//     is bad UX!)
// - indicates to the user when no patches were found or a request failed
// - improve copy of http-connection-error notification's button
// - when opening the Settings UI focused at a specific config, the correct scope,
//   `User` or `Workspace`, will be automatically selected based on which is actually
//   being evaluated as the result.

// TODO: use global state management (pinia) to map dependencies and effects of changing
// TODO: maninak make tooltip not go away on hover
// TODO: maninak show colored icon on tooltip
// TODO: maninak show full id on alias hover?
// TODO: maninak show `(${timeAgo})` after dates on tooltip (show full UTC date on hover?)
// TODO: maninak list all patch authors (or just their count?) and their
// abbreviated hash on tooltip
// TODO: maninak add "View Patch on web-app" on r-click (and on hover?)
// TODO: maninak sort by "Status of Patch", "Alias of creator", "Alias of most recent
// revision author", "Date of most recent revision"
export const patchesTreeDataProvider: TreeDataProvider<Patch | string> = {
  getTreeItem: (elem) => {
    if (typeof elem === 'string') {
      return { description: elem }
    }

    const icon = getIconForPatch(elem)

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

    const description = `${latestRevision.author.alias} ${bullet} ${shortenHash(elem.id)}`

    /**
     * Gives special markdown formatting to a string value, further indicating that
     * it is data received from the API and not fixed tooltip copy.
     */
    function dat(str: string): string {
      const formatingMarker = '_'

      return `${formatingMarker}${str}${formatingMarker}`
    }

    const topSection = [
      `$(${icon.id}) ${dat(capitalizeFirstLetter(elem.state.status))} ${emDash} ${dat(
        elem.id,
      )}`,
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
              getFormattedDateFromTs(latestRevision.timestamp),
            )}`,
          ]
        : []),
      `Created by ${dat(elem.author.alias)} on ${dat(
        getFormattedDateFromTs(firstRevision.timestamp),
      )}`,
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

      return patches
    }

    return undefined
  },
  onDidChangeTreeData: patchesRefreshEventEmitter.event,
} as const

// eslint-disable-next-line consistent-return
function getIconForPatch(patch: Patch): ThemeIcon {
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

function getFormattedDateFromTs(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    year: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
}
