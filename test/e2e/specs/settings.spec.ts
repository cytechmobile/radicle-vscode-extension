import { browser } from '@wdio/globals'
import type { OutputView, Setting, SettingsEditor, Workbench } from 'wdio-vscode-service'
import isEqual from 'lodash/isEqual'
import { Key } from 'webdriverio'
import { $ } from 'zx'
import { getFirstWelcomeViewText } from '../helpers/queries'
import {
  expectOutputToContain,
  expectStandardSidebarViewsToBeVisible,
} from '../helpers/assertions'
import {
  clearInput,
  closeRadicleViewContainer,
  openRadicleViewContainer,
} from '../helpers/actions'
import { nodeHomePath } from '../constants/config'

const tempNodeHomePath = `${nodeHomePath}.temp`

describe('Settings', () => {
  let workbench: Workbench
  let settings: SettingsEditor

  before(async () => {
    workbench = await browser.getWorkbench()
    settings = await workbench.openSettings()
    await openRadicleViewContainer(workbench)
    await expectStandardSidebarViewsToBeVisible(workbench)
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

    after(async () => {
      await clearInput(await getSettingsSearchBox(settings))
    })

    afterEach(async () => {
      await clearTextSetting(pathToRadBinarySetting)

      await expectStandardSidebarViewsToBeVisible(workbench)
    })

    it('warns the user if the rad binary is not found', async () => {
      await setTextSettingValue(pathToRadBinarySetting, '/tmp')

      await expectRadBinaryNotFoundToBeVisible(workbench)
    })

    it('recognizes the rad binary when a valid path is specified', async () => {
      await $`cp -r ${nodeHomePath} ${tempNodeHomePath}`

      await setTextSettingValue(pathToRadBinarySetting, `/tmp`)

      await expectRadBinaryNotFoundToBeVisible(workbench)

      await setTextSettingValue(pathToRadBinarySetting, `${tempNodeHomePath}/bin/rad`)

      await expectStandardSidebarViewsToBeVisible(workbench)

      await $`rm -rf ${tempNodeHomePath}`
    })

    // TODO: Unskip when #172 covered by this case is fixed
    it.skip('recognizes if the directory is created *after* the setting is set', async () => {
      await setTextSettingValue(pathToRadBinarySetting, tempNodeHomePath)

      await expectRadBinaryNotFoundToBeVisible(workbench)

      await $`cp -r ${nodeHomePath} ${tempNodeHomePath}`

      await expectStandardSidebarViewsToBeVisible(workbench)

      await $`rm -rf ${tempNodeHomePath}`
    })
  })

  /**
   * These tests is skipped on Linux CI because the extension is having issues resolving the correct
   * node home directory.
   *
   * TODO: Figure out why the extension is having issues resolving the correct node home directory
   * on Linux CI.
   */
  // eslint-disable-next-line max-len
  describe('VS Code, when updating the "Path to Radicle to Node Home" setting, @skipLinuxCI', () => {
    let pathToNodeHomeSetting: Setting
    let outputView: OutputView

    before(async () => {
      pathToNodeHomeSetting = await settings.findSetting(
        'Path To Node Home',
        'Radicle',
        'Advanced',
      )
      await workbench.executeCommand('Show Everything Logged in the Output Panel')
      outputView = await workbench.getBottomBar().openOutputView()
    })

    after(async () => {
      await clearInput(await getSettingsSearchBox(settings))
    })

    afterEach(async () => {
      await outputView.clearText()
      await clearTextSetting(pathToNodeHomeSetting)

      await expectRadicleIdentityToBeFound(outputView)
    })

    it('logs an error in the output console if the path is invalid', async () => {
      await outputView.clearText()

      await setTextSettingValue(pathToNodeHomeSetting, '/tmp')

      await expectRadicleProfileNotToBeFound(outputView)
    })

    it('recognizes when a valid path is specified', async () => {
      await $`cp -r ${nodeHomePath} ${tempNodeHomePath}`
      await outputView.clearText()

      await setTextSettingValue(pathToNodeHomeSetting, tempNodeHomePath)

      await expectRadicleIdentityToBeFound(outputView)

      await $`rm -rf ${tempNodeHomePath}`
    })

    // TODO: Unskip when #172 covered by this case is fixed
    it.skip('recognizes if the directory is created *after* the setting is set', async () => {
      await outputView.clearText()

      await setTextSettingValue(pathToNodeHomeSetting, tempNodeHomePath)

      await expectRadicleProfileNotToBeFound(outputView)

      await $`cp -r ${nodeHomePath} ${tempNodeHomePath}`

      await expectRadicleIdentityToBeFound(outputView)

      await $`rm -rf ${tempNodeHomePath}`
    })
  })
})

async function expectRadBinaryNotFoundToBeVisible(workbench: Workbench) {
  await browser.waitUntil(
    async () => {
      const welcomeText = await getFirstWelcomeViewText(workbench)

      return isEqual(welcomeText, [
        /* eslint-disable max-len */
        'Failed resolving the Radicle CLI binary.',
        "Please ensure it is installed on your machine and either that it is globally accessible in the shell as `rad` or that its path is correctly defined in the extension's settings.",
        "Please expect the extention's capabilities to remain severely limited until this issue is resolved.",
        /* eslint-enable max-len */
      ])
    },
    { timeoutMsg: 'expected the rad binary not found message to be visible' },
  )
}

async function expectRadicleIdentityToBeFound(outputView: OutputView) {
  await expectOutputToContain(outputView, 'Using already unsealed Radicle identity')
}

async function expectRadicleProfileNotToBeFound(outputView: OutputView) {
  await expectOutputToContain(outputView, '✗ Error: Radicle profile not found in')
}

/**
 * Workaround to get the value of a `TextSetting`.
 * The `getValue` method of a `TextSetting` seems to be wrongly implemented and returns null.
 */
async function getTextSettingValue(setting: Setting) {
  return await setting.textSetting$.getValue()
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

  await setting.textSetting$.click()
  await browser.keys([Key.Ctrl, 'a'])
  await browser.keys(Key.Backspace)
}

async function getSettingsSearchBox(settings: SettingsEditor) {
  return await settings.elem.$(settings.locatorMap.Editor['inputArea'] as string)
}
