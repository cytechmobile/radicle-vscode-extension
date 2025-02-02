import { browser } from '@wdio/globals'
import type { OutputView, Workbench } from 'wdio-vscode-service'

/**
 * Asserts the Output Panel contains the expected text.
 */
export async function expectOutputToContain(outputView: OutputView, expected: string) {
  await browser.waitUntil(
    async () => {
      /**
       * The text in the Output Panel is split by newlines, which can be affected by the size
       * of the window. To avoid this, we join the text into a single string.
       */
      const joinedText = (await outputView.getText()).join('')

      return joinedText.includes(expected)
    },
    {
      timeoutMsg: `expected the output text to contain "${expected}"`,
    },
  )
}

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
    { timeoutMsg: 'expected the standard sidebar views to be visible' },
  )
}
