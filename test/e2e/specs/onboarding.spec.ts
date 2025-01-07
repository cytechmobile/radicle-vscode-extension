import path from 'node:path'
import { browser, expect } from '@wdio/globals'
import type { Workbench } from 'wdio-vscode-service'
import { $, cd } from 'zx'
import type * as VsCode from 'vscode'
import isEqual from 'lodash/isEqual'
import { expectStandardSidebarViewsToBeVisible } from '../helpers/assertions'
import { openRadicleViewContainer } from '../helpers/actions'
import { getFirstWelcomeViewText } from '../helpers/queries'
import { backupNodeHomePath, e2eTestDirPath, nodeHomePath } from '../constants/config'

describe('Onboarding Flow', () => {
  let workbench: Workbench

  before(async () => {
    workbench = await browser.getWorkbench()
  })

  describe('VS Code, *before* Radicle is installed,', () => {
    after(async () => {
      await $`mv ${backupNodeHomePath} ${nodeHomePath}`
      await workbench.executeCommand('Developer: Reload Window')
    })

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
    it('guides the user on how to git-initialize their workspace', async () => {
      await openRadicleViewContainer(workbench)

      await browser.waitUntil(async () => {
        const welcomeText = await getFirstWelcomeViewText(workbench)
        const welcomeButtonTitles = await getFirstWelcomeViewButtonTitles(workbench)

        return (
          isEqual(welcomeText, [
            /* eslint-disable max-len */
            'The folder currently opened in your workspace is not a Git code repository.',
            'In order to use Radicle with it, this folder must first be initialized as a Git code repository.',
            'To learn more about how to use Git and source control in VS Code read the docs.',
            /* eslint-enable max-len */
          ]) &&
          isEqual(welcomeButtonTitles, [
            'Initialize Repository With Git',
            'Choose a Different Folder',
          ])
        )
      })
    })
  })

  describe('VS Code, *before* the workspace is rad-initialized,', () => {
    before(async () => {
      await initGitRepo()
    })

    it('guides the user on how to rad-initialize their git repo', async () => {
      await openRadicleViewContainer(workbench)

      await browser.waitUntil(async () => {
        const welcomeText = await getFirstWelcomeViewText(workbench)

        return isEqual(welcomeText, [
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
  })

  describe('VS Code, *after* the workspace is rad-initialized,', () => {
    before(async () => {
      await $`rad init --private --default-branch main --name "A_test_blog" --description "Some repo" --no-confirm --verbose`
      await workbench.executeCommand('Developer: Reload Window')
    })

    it('hides the non rad-initialized guide', async () => {
      await browser.waitUntil(async () => {
        const welcomeText = await getFirstWelcomeViewText(workbench)

        return welcomeText.some((text) => text.includes('rad init')) === false
      })
    })

    it('shows the standard sidebar views', async () => {
      const sidebarView = workbench.getSideBar().getContent()
      await sidebarView.wait()

      await expectStandardSidebarViewsToBeVisible(workbench)
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
