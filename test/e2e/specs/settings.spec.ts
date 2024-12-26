import { browser } from '@wdio/globals'
import type { Setting, SettingsEditor, Workbench } from 'wdio-vscode-service'
import isEqual from 'lodash/isEqual'
import { Key } from 'webdriverio'
import { $ } from 'zx'
import { extTempDir } from 'src/constants'
import { getFirstWelcomeViewText } from '../helpers/queries'
import { openRadicleViewContainer } from '../helpers/actions'
import { pathToNodeHome } from '../constants/config'
import { expectCliCommandsAndPatchesToBeVisible } from '../helpers/assertions'

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

  describe('VS Code, when updating the "Path to Rad Binary" setting,', () => {
    let pathToRadBinarySetting: Setting

    before(async () => {
      pathToRadBinarySetting = await settings.findSetting(
        'Path To Rad Binary',
        'Radicle',
        'Advanced',
      )
    })

    afterEach(async () => {
      await clearSettingInput(pathToRadBinarySetting)

      await expectCliCommandsAndPatchesToBeVisible(workbench)
    })

    it('warns the user if the rad binary is not found', async () => {
      await pathToRadBinarySetting.setValue('/tmp')
      await openRadicleViewContainer(workbench)

      await expectRadBinaryNotFoundToBeVisible(workbench)
    })

    // This functionality does not seem to work
    // eslint-disable-next-line max-len
    it.skip('recognizes if the directory is created *after* the setting is updated', async () => {
      const tempNodeHomePath = `${extTempDir}/.radicle/installation-backup`
      await pathToRadBinarySetting.setValue(`${tempNodeHomePath}/bin/rad`)

      await expectRadBinaryNotFoundToBeVisible(workbench)

      await $`cp -r ${pathToNodeHome} ${tempNodeHomePath}`

      await expectCliCommandsAndPatchesToBeVisible(workbench)

      await clearSettingInput(pathToRadBinarySetting)
      await $`rm -rf ${tempNodeHomePath}`
    })
  })

  // describe('Setting: Path To Node Home', () => { })
})

async function expectRadBinaryNotFoundToBeVisible(workbench: Workbench) {
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

async function clearSettingInput(setting: Setting) {
  /**
   * `.setValue('')` updates the value of the input but does not trigger an
   * update in the extension. Not sure if this is a bug in the extension, vscode, or
   * webdriverio.
   *
   * The following is a workaround that does trigger an update in the extension.
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await (await setting.textSetting$).click()
  await browser.keys([Key.Ctrl, 'a'])
  await browser.keys(Key.Backspace)
}
