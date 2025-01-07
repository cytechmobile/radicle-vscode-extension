import type { Workbench } from 'wdio-vscode-service'

/**
 * Retrieves the welcome text content from the first section in the sidebar view.
 *
 * @example await getFirstWelcomeViewText(workbench) // ["Welcome to Radicle!", "Get started by ..."]
 *
 * @returns The text content found as an array of strings split by newlines. If no content is
 * found, an empty array.
 */
export async function getFirstWelcomeViewText(workbench: Workbench) {
  const sidebarView = workbench.getSideBar().getContent()
  await sidebarView.wait()

  const welcomeText =
    (await (
      await (await sidebarView.getSections())[0]?.findWelcomeContent()
    )?.getTextSections()) ?? []

  return welcomeText
}
