import path from 'node:path'
import { browser, expect } from '@wdio/globals'
import { e2eTestDirPath } from 'test/e2e/constants/config'
import type { ViewSection, Workbench } from 'wdio-vscode-service'
import { $, cd } from 'zx'
import type * as VsCode from 'vscode'

describe('Onboarding Flow', () => {
  let workbench: Workbench

  before(async () => {
    await initGitRepo()
    workbench = await browser.getWorkbench()
  })

  describe('VS Code, *before* the workspace is rad-initialized,', () => {
    it('has our Radicle extension installed and available', async () => {
      const extensions = await browser.executeWorkbench(
        (vscode: typeof VsCode) => vscode.extensions.all,
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

      const welcomeText = await getFirstWelcomeViewText(workbench)
      expect(welcomeText).toEqual([
        /* eslint-disable max-len */
        'The Git repository currently opened in your workspace is not yet initialized with Radicle.',
        'To use Radicle with it, please run `rad init` in your terminal.',
        'Once rad-initialized, this repo will have access to advanced source control, collaboration and project management capabilities powered by both Git and Radicle.',
        'During this reversible rad-initializing process you also get to choose whether your repo will be private or public, among other options.',
        'To learn more read the Radicle User Guide.',
        /* eslint-enable max-len */
      ])
      expect(welcomeText.some((text) => text.includes('rad init'))).toBe(true)
    })
  })

  describe('VS Code, *after* the workspace is rad-initialized,', () => {
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
      const welcomeText = await getFirstWelcomeViewText(workbench)
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

async function initGitRepo() {
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

async function getFirstWelcomeViewText(workbench: Workbench) {
  const sidebarView = workbench.getSideBar().getContent()
  await sidebarView.wait()

  const welcomeText =
    (await (
      await (await sidebarView.getSections())[0]?.findWelcomeContent()
    )?.getTextSections()) ?? []

  return welcomeText
}
