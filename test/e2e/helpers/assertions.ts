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
