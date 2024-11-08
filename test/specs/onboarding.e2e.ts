import path from 'node:path'
import { browser, expect } from '@wdio/globals'
import { e2eTestDirPath } from 'test/constants/config'
import type { ViewSection, Workbench } from 'wdio-vscode-service'
import { $, cd } from 'zx'

type VsCodeType = typeof import('vscode')

describe('onboarding flow', () => {
  let workbench: Workbench

  before(async () => {
    await setUpGitRepo()
    workbench = await browser.getWorkbench()
  })

  describe('before the repo is initialized as a radicle repo', () => {
    it('should load and install the extension', async () => {
      const extensions = await browser.executeWorkbench(
        (vscode: VsCodeType) => vscode.extensions.all,
      )
      expect(
        extensions.some((extension) => extension.id === 'radicle-ide-plugins-team.radicle'),
      ).toBe(true)
    })

    it('should show the "Radicle" sidebar tab', async () => {
      const radicleViewControl = await workbench.getActivityBar().getViewControl('Radicle')
      const title = await radicleViewControl?.getTitle()
      expect(title).toBe('Radicle')
    })

    it('should show the `rad init` copy', async () => {
      await openRadicleSidebarTab(workbench)

      const welcomeText = await findFirstSectionWelcomeText(workbench)
      expect(welcomeText.some((text) => text.includes('rad init'))).toBe(true)
    })
  })

  describe('after the repo has been initialized as a radicle repo', () => {
    let cliCommandsSection: ViewSection

    before(async () => {
      await $`rad init --private --default-branch main --name "A_test_blog" --description "Some repo" --no-confirm --verbose`
      await openRadicleSidebarTab(workbench)
      const sidebarView = workbench.getSideBar().getContent()
      await sidebarView.wait()

      cliCommandsSection = await sidebarView.getSection('CLI COMMANDS')
      await cliCommandsSection.collapse()

      const patchesSection = await sidebarView.getSection('PATCHES')
      await patchesSection.collapse()
    })

    it('should not show the `rad init` copy', async () => {
      const welcomeText = await findFirstSectionWelcomeText(workbench)
      expect(welcomeText.some((text) => text.includes('rad init'))).not.toBe(true)
    })

    it('should show the correct copy and buttons on the CLI Commands section', async () => {
      await cliCommandsSection.expand()
      // Fixes flakiness on macOS CI
      await browser.pause(100)

      const welcomeContent = await cliCommandsSection?.findWelcomeContent()
      const welcomeText = (await welcomeContent?.getTextSections()) ?? []
      const buttons = (await welcomeContent?.getButtons()) ?? []
      const buttonTitles = await Promise.all(
        buttons.map(async (button) => await button.getTitle()),
      )
      expect(
        welcomeText.some((text) =>
          /Use the buttons below to perform common interactions with the Radicle network./i.test(
            text,
          ),
        ),
      ).toBe(true)
      expect(buttonTitles).toEqual(['Sync', 'Fetch', 'Announce'])
    })
  })
})

async function setUpGitRepo() {
  const repoDirPath = path.join(e2eTestDirPath, 'fixtures/workspaces/a_blog')

  await $`mkdir -p ${repoDirPath}`
  cd(repoDirPath)
  await $`git config --global init.defaultBranch main`
  await $`git init .`
  await $`git config --global user.email "test@radicle.xyz"`
  await $`git config --global user.name "Radicle Test"`
  await $`echo "# A Blog" > README.md`
  await $`git add README.md`
  await $`git commit -m 'adds readme' --no-gpg-sign`
}

async function openRadicleSidebarTab(workbench: Workbench) {
  const activityBar = workbench.getActivityBar()
  await activityBar.wait()

  const radicleViewControl = await activityBar.getViewControl('Radicle')
  await radicleViewControl?.wait()

  await radicleViewControl?.openView()
}

async function findFirstSectionWelcomeText(workbench: Workbench) {
  const sidebarView = workbench.getSideBar().getContent()
  await sidebarView.wait()
  const firstSection = (await sidebarView.getSections())[0]
  const welcomeContent = await firstSection?.findWelcomeContent()
  const welcomeText = (await welcomeContent?.getTextSections()) ?? []

  return welcomeText
}
