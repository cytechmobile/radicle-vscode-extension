import path from 'node:path'
import { browser, expect } from '@wdio/globals'
import { e2eTestDirPath } from 'test/constants/config'
import type { ViewContent, ViewSection, Workbench } from 'wdio-vscode-service'
import { $, cd } from 'zx'

type VsCodeType = typeof import('vscode')

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

async function openRadicleViewControl(workbench: Workbench) {
  const activityBar = workbench.getActivityBar()
  await activityBar.wait()

  const radicleViewControl = await activityBar.getViewControl('Radicle')
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
    await setUpGitRepo()
    workbench = await browser.getWorkbench()
  })

  it('should load and install our VSCode Extension', async () => {
    const extensions = await browser.executeWorkbench(
      (vscode: VsCodeType) => vscode.extensions.all,
    )

    expect(
      extensions.some((extension) => extension.id === 'radicle-ide-plugins-team.radicle'),
    ).toBe(true)
  })

  it('should show the "Radicle" activity item', async () => {
    const radicleViewControl = await workbench.getActivityBar().getViewControl('Radicle')
    const title = await radicleViewControl?.getTitle()
    expect(title).toBe('Radicle')
  })

  it('should show the `rad init` text when the repo is not a radicle repo', async () => {
    await openRadicleViewControl(workbench)

    const welcomeText = await findFirstSectionWelcomeText(workbench)
    expect((welcomeText ?? []).some((text) => text.includes('rad init'))).toBe(true)
  })

  describe('sections', () => {
    let sidebarView: ViewContent
    let cliCommandsSection: ViewSection
    let patchesSection: ViewSection

    before(async () => {
      await $`rad init --private --default-branch main --name "A_test_blog" --description "Some repo" --no-confirm --verbose`
      await openRadicleViewControl(workbench)
      sidebarView = workbench.getSideBar().getContent()
      await sidebarView.wait()
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
        expect(buttonTitles[0]).toBe('Sync')
        expect(buttonTitles[1]).toBe('Fetch')
        expect(buttonTitles[2]).toBe('Announce')
      })
    })
  })
})
