import path from 'node:path'
import os from 'node:os'
import { browser, expect } from '@wdio/globals'
import { e2eTestDirPath } from 'test/e2e/constants/config'
import type { ViewSection, Workbench } from 'wdio-vscode-service'
import { $, cd, echo } from 'zx'
import type * as VsCode from 'vscode'

describe('Onboarding Flow', () => {
  let workbench: Workbench

  before(async () => {
    workbench = await browser.getWorkbench()
  })

  describe('VS Code, *before* Radicle is installed,', () => {
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

    it('instructs the user to install radicle', async () => {
      await openRadicleViewContainer(workbench)

      const welcomeText = await getFirstWelcomeViewText(workbench)
      const buttonTitles = await getFirstWelcomeViewButtonTitles(workbench)

      expect(welcomeText).toEqual([
        /* eslint-disable max-len */
        'Failed resolving the Radicle CLI binary.',
        "Please ensure it is installed on your machine and either that it is globally accessible in the shell as `rad` or that its path is correctly defined in the extension's settings.",
        "Please expect the extention's capabilities to remain severely limited until this issue is resolved.",
        /* eslint-enable max-len */
      ])

      expect(buttonTitles).toEqual(['Troubleshoot'])
    })
  })

  describe('VS Code, *before* the workspace is git-initialized,', () => {
    before(async () => {
      await installRadicle()
    })

    it('guides the user on how to git-initialize their workspace', async () => {
      await openRadicleViewContainer(workbench)

      const welcomeText = await getFirstWelcomeViewText(workbench)
      const welcomeButtonTitles = await getFirstWelcomeViewButtonTitles(workbench)

      expect(welcomeText).toEqual([
        /* eslint-disable max-len */
        'The folder currently opened in your workspace is not a Git code repository.',
        'In order to use Radicle with it, this folder must first be initialized as a Git code repository.',
        'To learn more about how to use Git and source control in VS Code read the docs.',
        /* eslint-enable max-len */
      ])

      expect(welcomeButtonTitles).toEqual([
        'Initialize Repository With Git',
        'Choose a Different Folder',
      ])
    })
  })

  describe('VS Code, *before* the workspace is rad-initialized,', () => {
    before(async () => {
      await initGitRepo()
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

async function installRadicle() {
  echo`Installing Radicle...`
  cd(os.homedir())
  const radHome = path.join(os.homedir(), '.radicle')
  const radBin = path.join(radHome, 'bin')
  // add RAD_HOME as an environment variable
  await $`export RAD_HOME=${radHome}`
  await $`curl -sSf https://radicle.xyz/install | sh`

  echo`Installing radicle-httpd...`

  await $`case "$(uname)/$(uname -m)" in
    Darwin/arm64)
      export TARGET="aarch64-apple-darwin" ;;
    Darwin/x86_64)
      export TARGET="x86_64-apple-darwin" ;;
    Linux/arm64|Linux/aarch64)
      export TARGET="aarch64-unknown-linux-musl" ;;
    Linux/x86_64)
      export TARGET="x86_64-unknown-linux-musl" ;;
    *)
      fatal "Your operating system is currently unsupported. Sorry!" ;;
    esac
    echo $TARGET
    curl -s https://files.radicle.xyz/releases/radicle-httpd/0.17.0/radicle-httpd-0.17.0-$TARGET.tar.xz | tar -xJ --strip-components=2
  `
  await $`mv radicle-httpd ${radBin}/radicle-httpd`

  echo('Installed')
  echo`ls .radicle`
  echo`ls .radicle/bin`
  echo`Over..`
}

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

async function getFirstWelcomeViewButtonTitles(workbench: Workbench) {
  const sidebarView = workbench.getSideBar().getContent()
  await sidebarView.wait()

  const buttons =
    (await (await (await sidebarView.getSections())[0]?.findWelcomeContent())?.getButtons()) ??
    []
  const buttonTitles = await Promise.all(
    buttons.map(async (button) => await button.getTitle()),
  )

  return buttonTitles
}
