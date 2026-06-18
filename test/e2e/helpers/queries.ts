import type { Workbench } from 'wdio-vscode-service'

/** The welcome content of the sidebar's first (topmost) section, if any is shown. */
async function getFirstWelcomeContent(workbench: Workbench) {
  const sidebarView = workbench.getSideBar().getContent()
  const firstSection = (await sidebarView.getSections())[0]

  return await firstSection?.findWelcomeContent()
}

/**
 * Retrieves the welcome text content from the first section in the sidebar view.
 *
 * @example await getFirstWelcomeViewText(workbench) // ["Welcome to Radicle!", "Get started by ..."]
 *
 * @returns The text content as an array of strings split by newlines, or an empty array if no
 * welcome content is shown.
 */
export async function getFirstWelcomeViewText(workbench: Workbench): Promise<string[]> {
  const welcomeContent = await getFirstWelcomeContent(workbench)
  const welcomeText = (await welcomeContent?.getTextSections()) ?? []

  return welcomeText
}

/**
 * Retrieves the button titles from the first section's welcome view, in display order.
 *
 * @example await getFirstWelcomeViewButtonTitles(workbench) // ["Initialize Repository With Git"]
 *
 * @returns The button titles, or an empty array if no welcome content is shown.
 */
export async function getFirstWelcomeViewButtonTitles(
  workbench: Workbench,
): Promise<string[]> {
  const welcomeContent = await getFirstWelcomeContent(workbench)
  const buttons = (await welcomeContent?.getButtons()) ?? []
  const buttonTitles = await Promise.all(
    buttons.map(async (button) => await button.getTitle()),
  )

  return buttonTitles
}
