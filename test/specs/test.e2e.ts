import { $, browser, expect } from '@wdio/globals'
import type { TreeItem, ViewContent, ViewSection, Workbench } from 'wdio-vscode-service'

async function openRadicleViewControl(workbench: Workbench) {
  const radicleViewControl = await workbench.getActivityBar().getViewControl('Radicle')
  await radicleViewControl?.wait()
  await radicleViewControl?.openView()
}

async function findFirstSectionWelcomeText(workbench: Workbench) {
  const sidebar = workbench.getSideBar()
  await sidebar.wait()

  const firstSection = (await sidebar.getContent().getSections())[0]
  const welcomeContent = await firstSection?.findWelcomeContent()
  const welcomeText = await welcomeContent?.getTextSections()

  return welcomeText
}

describe('VS Code Extension Testing', () => {
  let workbench: Workbench

  before(async () => {
    workbench = await browser.getWorkbench()
  })

  it('should be able to load VSCode', async () => {
    const title = await workbench.getTitleBar().getTitle()
    expect(title).toContain('[Extension Development Host]')
  })

  it('should load and install our VSCode Extension', async () => {
    const extensions = await browser.executeWorkbench((vscodeApi) => vscodeApi.extensions.all)
    expect(
      extensions.some(
        (extension: { id: string }) => extension.id === 'radicle-ide-plugins-team.radicle',
      ),
    ).toBe(true)
  })

  it('should show the "Radicle" activity item', async () => {
    const radicleViewControl = await workbench.getActivityBar().getViewControl('Radicle')
    const title = await radicleViewControl?.getTitle()
    expect(title).toBe('Radicle')
  })

  // Skipping this for now as we cannot change folder in tests
  it.skip('should show the `rad init` text when in the sidebar when the repo is not a radicle repo', async () => {
    await openRadicleViewControl(workbench)

    const welcomeText = await findFirstSectionWelcomeText(workbench)
    expect((welcomeText ?? []).some((text) => text.includes('rad init'))).toBe(true)
  })

  describe.only('sections', () => {
    let sidebarView: ViewContent
    let cliCommandsSection: ViewSection
    let patchesSection: ViewSection

    before(async () => {
      await openRadicleViewControl(workbench)
      sidebarView = workbench.getSideBar().getContent()
      cliCommandsSection = await sidebarView.getSection('CLI COMMANDS')
      patchesSection = await sidebarView.getSection('PATCHES')
      await cliCommandsSection.collapse()
      await patchesSection.collapse()
    })

    describe('CLI Commands section', () => {
      before(async () => {
        await cliCommandsSection.expand()
      })

      after(async () => {
        await cliCommandsSection.collapse()
      })

      it('should show the correct text and buttons on the CLI Commands section', async () => {
        await cliCommandsSection.expand()

        const welcomeContent = await cliCommandsSection?.findWelcomeContent()
        const welcomeText = (await welcomeContent?.getTextSections()) ?? []
        const buttons = (await welcomeContent?.getButtons()) ?? []

        const buttonTitles = await Promise.all(buttons.map(async (button) => button.getTitle()))

        expect(
          welcomeText.some((text) =>
            /Use the buttons below to perform common interactions with the Radicle network./i.test(
              text,
            ),
          ),
        ).toBe(true)
        expect(buttonTitles[0]).toBe('Sync')
        expect(buttonTitles[1]).toBe('Fetch')
        expect(buttonTitles[2]).toBe('Announce')
      })
    })

    describe('Patches section', () => {
      before(async () => {
        await patchesSection.expand()
      })

      after(async () => {
        await patchesSection.collapse()
      })


      it.only('should list the repo\'s patches', async () => {
        // TODO: zac - Create repo with patches, update expectedLabels with those patches
        const expectedPatches = [
          '❬✓❭ feat(config): implement runtime configuration via json file',
          'test patch 7',
          'chore(repo): setup radicle github actions',
          'chore(repo): test-patch-5',
          'chore(repo): test-patch-3',
          'chore(repo): test-patch-2',
          'chore(repo): test patch 2',
          'chore(repo): setup radicle github actions',
          'chore(repo): setup radicle github actions',
          'chore(repo): setup radicle github actions',
          'chore(repo): setup radicle github actions',
          'chore(repo): setup radicle GiHhub Actions integration',
          'Add container packaging'
        ]

        const items = (await patchesSection?.getVisibleItems()) as TreeItem[]
        const labels = await Promise.all(items.map(async (item) => await item.getLabel()))

        expectedPatches.forEach((label, index) => {
          expect(labels[index]).toBe(label)
        })
      })

      it("should be able to open a patch's details", async () => {
        const items = (await patchesSection?.getVisibleItems()) as TreeItem[]
        const firstItem = items[0]!
        const menu = await firstItem.openContextMenu()
        const menuItem = await menu.getItem('Open Patch Details')
        await menuItem?.select()

        // Need to get webview by index because it doesn't have a title
        await browser.waitUntil(async () => (await workbench.getAllWebviews()).length > 0)
        const webviews = await workbench.getAllWebviews()
        expect(webviews).toHaveLength(1)
        await webviews[0]!.open()

        await expect($('h1')).toHaveText(
          'feat(config): implement runtime configuration via json file',
        )
      })
    })
  })

  // it.only('should find the buttons', async () => {
  //

  //   await openRadicleViewControl(workbench)

  //   const sidebarView = workbench.getSideBar().getContent()

  //   const cliCommandsSection = await sidebarView.getSection('CLI COMMANDS')
  //   await cliCommandsSection?.collapse()

  //   const patchesSection = await sidebarView.getSection('PATCHES')
  //   const items = await patchesSection?.getVisibleItems() as TreeItem[]
  //   const firstItem = items[0]!
  //   const menu = await firstItem.openContextMenu();
  //   const menuItem = await menu.getItem('Open Patch Details')
  //   await menuItem?.select()

  //   await browser.waitUntil(async () => (await workbench.getAllWebviews()).length > 0)
  //   const webviews = await workbench.getAllWebviews()
  //   expect(webviews).toHaveLength(1)
  //   await webviews[0]!.open()

  //   const editButton = await $('aria/Edit Patch Title and Description')
  //   await editButton.click()

  //   await browser.pause(2000)

  //   const discardButton = await $('aria/Stop Editing and Discard Current Changes')
  //   await discardButton.click()

  //   await browser.pause(50000)
  // })
})
