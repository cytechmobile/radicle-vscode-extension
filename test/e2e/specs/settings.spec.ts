import { browser } from '@wdio/globals'
import type { Setting, SettingsEditor, Workbench } from 'wdio-vscode-service'
import isEqual from 'lodash/isEqual'
import { type ChainablePromiseElement, Key } from 'webdriverio'
import { $ } from 'zx'
import { getFirstWelcomeViewText } from '../helpers/queries'
import { expectCliCommandsAndPatchesToBeVisible } from '../helpers/assertions'
import { closeRadicleViewContainer, openRadicleViewContainer } from '../helpers/actions'
import { pathToNodeHome } from '../constants/config'

describe('Settings', () => {
  let workbench: Workbench
  let settings: SettingsEditor

  before(async () => {
    workbench = await browser.getWorkbench()
    settings = await workbench.openSettings()
    await openRadicleViewContainer(workbench)
    await expectCliCommandsAndPatchesToBeVisible(workbench)
  })

  after(async () => {
    await closeRadicleViewContainer(workbench)
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
      await clearTextSetting(pathToRadBinarySetting)

      await expectCliCommandsAndPatchesToBeVisible(workbench)
    })

    it('warns the user if the rad binary is not found', async () => {
      await browser.pause(1000)
      await setTextSettingValue(pathToRadBinarySetting, '/tmp')

      await expectRadBinaryNotFoundToBeVisible(workbench)
    })

    it('recognizes the rad binary when a valid path is specified', async () => {
      const tempNodeHomePath = `${pathToNodeHome}.temp`
      await $`cp -r ${pathToNodeHome} ${tempNodeHomePath}`

      await setTextSettingValue(pathToRadBinarySetting, `/tmp`)

      await expectRadBinaryNotFoundToBeVisible(workbench)

      await setTextSettingValue(pathToRadBinarySetting, `${tempNodeHomePath}/bin/rad`)

      await expectCliCommandsAndPatchesToBeVisible(workbench)

      await $`rm -rf ${tempNodeHomePath}`
    })

    // This functionality does not seem to work
    // eslint-disable-next-line max-len
    it.skip('recognizes if the directory is created *after* the setting is updated', async () => {
      const tempNodeHomePath = `${pathToNodeHome}.temp`

      await setTextSettingValue(pathToRadBinarySetting, tempNodeHomePath)

      await expectRadBinaryNotFoundToBeVisible(workbench)

      await $`cp -r ${pathToNodeHome} ${tempNodeHomePath}`

      await expectCliCommandsAndPatchesToBeVisible(workbench)

      await clearTextSetting(pathToRadBinarySetting)

      await $`rm -rf ${tempNodeHomePath}`
    })
  })
})

async function expectRadBinaryNotFoundToBeVisible(workbench: Workbench) {
  await browser.waitUntil(
    async () => {
      const welcomeText = await getFirstWelcomeViewText(workbench)

      console.log({ welcomeText })

      return isEqual(welcomeText, [
        /* eslint-disable max-len */
        'Failed resolving the Radicle CLI binary.',
        "Please ensure it is installed on your machine and either that it is globally accessible in the shell as `rad` or that its path is correctly defined in the extension's settings.",
        "Please expect the extention's capabilities to remain severely limited until this issue is resolved.",
        /* eslint-enable max-len */
      ])
    },
    {
      timeoutMsg: 'expected the rad binary not found message to be visible',
      // TODO: zac fine tune these (globally?)
      timeout: 20000,
      interval: 500,
    },
  )
}

function getTextSettingInput(setting: Setting) {
  return setting.textSetting$ as ChainablePromiseElement
}

/**
 * Workaround to get the value of a `TextSetting`.
 * The `getValue` method of a `TextSetting` seems to be wrongly implemented and returns null.
 */
async function getTextSettingValue(setting: Setting) {
  return await getTextSettingInput(setting).getValue()
}

async function setTextSettingValue(setting: Setting, value: string) {
  await clearTextSetting(setting)
  await setting.setValue(value)
}

async function clearTextSetting(setting: Setting) {
  /**
   * `.setValue('')` updates the value of the input but does not trigger an
   * update in the extension. Not sure if this is a bug in the extension, vscode, or
   * webdriverio.
   *
   * The following is a workaround that does trigger an update in the extension.
   */
  if ((await getTextSettingValue(setting)) === '') {
    return
  }

  await getTextSettingInput(setting).click()
  await browser.keys([Key.Ctrl, 'a'])
  await browser.keys(Key.Backspace)
}
