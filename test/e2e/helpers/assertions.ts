import { browser } from '@wdio/globals'
import type { Workbench } from 'wdio-vscode-service'

/**
 * Asserts that the CLI Commands and Patches sections are visible in the sidebar. This is
 * considered the default state when the workspace is open with a git and rad initialized
 * repository.
 */
export async function expectCliCommandsAndPatchesToBeVisible(workbench: Workbench) {
  const sidebarView = workbench.getSideBar().getContent()
  await sidebarView.wait()

  await browser.waitUntil(async () => {
    let sectionsFound = false
    try {
      await sidebarView.getSection('CLI COMMANDS')
      await sidebarView.getSection('PATCHES')
      sectionsFound = true
      // eslint-disable-next-line prettier-vue/prettier
    } catch { }

    return sectionsFound
  })
}
