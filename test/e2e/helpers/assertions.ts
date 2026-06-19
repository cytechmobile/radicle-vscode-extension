import type { Workbench } from 'wdio-vscode-service'
import { browser } from '@wdio/globals'

/** Order-sensitive, shallow equality for two string arrays. */
export function areStringArraysEqual(first: string[], second: string[]): boolean {
  return first.length === second.length && first.every((item, index) => item === second[index])
}

/**
 * Asserts that the CLI Commands and Patches sections are visible in the sidebar. This is
 * considered the default state when the workspace is open with a git and rad initialized
 * repository.
 */
export async function expectStandardSidebarViewsToBeVisible(workbench: Workbench) {
  await browser.waitUntil(
    async () => {
      const sidebarView = workbench.getSideBar().getContent()

      try {
        await Promise.all([
          sidebarView.getSection('CLI COMMANDS'),
          sidebarView.getSection('PATCHES'),
        ])

        return true
      } catch {
        return false
      }
    },
    { timeoutMsg: 'expected the standard sidebar views to be visible' },
  )
}

/** Waits until some currently shown notification contains all the given substrings. */
export async function expectNotificationToContain(
  workbench: Workbench,
  ...requiredSubstrings: string[]
) {
  let shownMessages: string[] = []
  try {
    await browser.waitUntil(async () => {
      try {
        const notifications = await workbench.getNotifications()
        shownMessages = await Promise.all(
          notifications.map(async (notification) => await notification.getMessage()),
        )
      } catch {
        // Notifications flicker and re-render, which can invalidate elements mid-read. Treat
        // that as "not matched yet" and let waitUntil retry.
        return false
      }
      const hasMatchingNotification = shownMessages.some((message) =>
        requiredSubstrings.every((substring) => message.includes(substring)),
      )

      return hasMatchingNotification
    })
  } catch {
    throw new Error(
      `expected a notification containing "${requiredSubstrings.join('" and "')}", ` +
        `but the shown notifications were:\n${shownMessages.join('\n')}`,
    )
  }
}
