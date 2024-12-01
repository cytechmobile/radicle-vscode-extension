import { browser } from '@wdio/globals'
import type { SettingsEditor, Workbench } from 'wdio-vscode-service'
import isEqual from 'lodash/isEqual'
import { Key } from 'webdriverio'
import { getFirstWelcomeViewText } from '../helpers/queries'
import { openRadicleViewContainer } from '../helpers/actions'

describe('Settings', () => {
  let workbench: Workbench
  let settings: SettingsEditor

  before(async () => {
    workbench = await browser.getWorkbench()
    settings = await workbench.openSettings()
  })

  after(async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (settings && (await settings.elem.isExisting())) {
      await browser.keys([Key.Ctrl, 'w'])
    }
  })

  describe('Path to Rad Binary', () => {
    it('warns the user if the rad binary is not found', async () => {
      const pathToRadBinary = await settings.findSetting(
        'Path To Rad Binary',
        'Radicle',
        'Advanced',
      )
      await pathToRadBinary.setValue('/tmp')
      await openRadicleViewContainer(workbench)

      await expectRadCliBinaryNotFoundToBeVisible(workbench)

      /**
       * `.setValue('')` updates the value of the input but does not trigger an
       * update in the extension. Not sure if this is a bug in the extension, vscode, or
       * webdriverio.
       *
       * The following is a workaround that does trigger an update in the extension.
       */
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (await pathToRadBinary.textSetting$).click()
      await browser.keys([Key.Ctrl, 'a'])
      await browser.keys(Key.Backspace)

      await expectCliCommandsAndPatchesToBeVisible(workbench)
    })
  })

  // describe('Setting: Path To Node Home', () => { })
})

async function expectRadCliBinaryNotFoundToBeVisible(workbench: Workbench) {
  return await browser.waitUntil(async () => {
    const welcomeText = await getFirstWelcomeViewText(workbench)

    return isEqual(welcomeText, [
      /* eslint-disable max-len */
      'Failed resolving the Radicle CLI binary.',
      "Please ensure it is installed on your machine and either that it is globally accessible in the shell as `rad` or that its path is correctly defined in the extension's settings.",
      "Please expect the extention's capabilities to remain severely limited until this issue is resolved.",
      /* eslint-enable max-len */
    ])
  })
}

async function expectCliCommandsAndPatchesToBeVisible(workbench: Workbench) {
  const sidebarView = workbench.getSideBar().getContent()
  await sidebarView.wait()

  return await browser.waitUntil(async () => {
    let sectionsFound = false
    try {
      await sidebarView.getSection('CLI COMMANDS')
      await sidebarView.getSection('PATCHES')
      sectionsFound = true
      // eslint-disable-next-line prettier-vue/prettier
    } catch { }

    return sectionsFound
  })
}
