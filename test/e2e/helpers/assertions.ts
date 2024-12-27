import { browser } from '@wdio/globals'
import type { Workbench } from 'wdio-vscode-service'

/**
 * Asserts that the CLI Commands and Patches sections are visible in the sidebar. This is
 * considered the default state when the workspace is open with a git and rad initialized
 * repository.
 */
export async function expectStandardSidebarViewsToBeVisible(workbench: Workbench) {
  const sidebarView = workbench.getSideBar().getContent()
  await sidebarView.wait()

  await browser.waitUntil(
    async () => {
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
    {
      timeoutMsg: 'expected the standard sidebar views to be visible',
      // TODO: zac fine tune these (globally?)
      timeout: 20000,
      interval: 500,
    },
  )
}
