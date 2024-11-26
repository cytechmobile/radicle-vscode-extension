import path from 'node:path'
import { browser, expect } from '@wdio/globals'
import { e2eTestDirPath } from 'test/e2e/constants/config'
import type { ViewSection, Workbench } from 'wdio-vscode-service'
import { $, cd } from 'zx'

type VsCodeType = typeof import('vscode')

describe('Onboarding Flow', () => {
  let workbench: Workbench

  before(async () => {
    await setUpGitRepo()
    workbench = await browser.getWorkbench()
  })

  describe('VS Code, *before* the workspace is rad-initialized', () => {
    it('has our Radicle extension installed and available', async () => {
      const extensions = await browser.executeWorkbench(
        (vscode: VsCodeType) => vscode.extensions.all,
      )
      expect(
        extensions.some((extension) => extension.id === 'radicle-ide-plugins-team.radicle'),
      ).toBe(true)
    })

    it('shows the Radicle button in the Activity Bar', async () => {
      const radicleViewControl = await workbench.getActivityBar().getViewControl('Radicle')
      const title = await radicleViewControl?.getTitle()
      expect(title).toBe('Radicle')
    })

    it('guides the user on how to rad-initialize their git repo', async () => {
      await openRadicleViewContainer(workbench)

      const welcomeText = await findFirstWelcomeViewText(workbench)
      expect(welcomeText.some((text) => text.includes('rad init'))).toBe(true)
    })
  })

  describe('VS Code, *after* the workspace us rad-initialized', () => {
    let cliCommandsSection: ViewSection

    before(async () => {
      await $`rad init --private --default-branch main --name "A_test_blog" --description "Some repo" --no-confirm --verbose`
      await openRadicleViewContainer(workbench)
      const sidebarView = workbench.getSideBar().getContent()
      await sidebarView.wait()

      cliCommandsSection = await sidebarView.getSection('CLI COMMANDS')
      await cliCommandsSection.collapse()

      const patchesSection = await sidebarView.getSection('PATCHES')
      await patchesSection.collapse()
    })

    it('hides the non rad-initialized guide', async () => {
      const welcomeText = await findFirstWelcomeViewText(workbench)
      expect(welcomeText.some((text) => text.includes('rad init'))).not.toBe(true)
    })

    it('shows the CLI Commands section', async () => {
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
  const repoDirPath = path.join(e2eTestDirPath, 'fixtures/workspaces/basic')

  await $`mkdir -p ${repoDirPath}`
  cd(repoDirPath)
  await $`git config --global init.defaultBranch main`
  await $`git init .`
  await $`git config --global user.email "test@radicle.xyz"`
  await $`git config --global user.name "Radicle Test"`
  await $`echo "# Basic Repo" > README.md`
  await $`git add README.md`
  await $`git commit -m 'adds readme' --no-gpg-sign`
}

async function openRadicleViewContainer(workbench: Workbench) {
  const activityBar = workbench.getActivityBar()
  await activityBar.wait()

  const radicleViewControl = await activityBar.getViewControl('Radicle')
  await radicleViewControl?.wait()

  await radicleViewControl?.openView()
}

async function findFirstWelcomeViewText(workbench: Workbench) {
  const sidebarView = workbench.getSideBar().getContent()
  await sidebarView.wait()
  const firstSection = (await sidebarView.getSections())[0]
  const welcomeContent = await firstSection?.findWelcomeContent()
  const welcomeText = (await welcomeContent?.getTextSections()) ?? []

  return welcomeText
}
