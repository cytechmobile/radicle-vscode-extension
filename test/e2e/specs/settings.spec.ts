import { browser } from '@wdio/globals'
import type { Setting, SettingsEditor, Workbench } from 'wdio-vscode-service'
import isEqual from 'lodash/isEqual'
import { Key } from 'webdriverio'
import { $ } from 'zx'
import { getFirstWelcomeViewText } from '../helpers/queries'
import { expectStandardSidebarViewsToBeVisible } from '../helpers/assertions'
import { closeRadicleViewContainer, openRadicleViewContainer } from '../helpers/actions'
import { nodeHomePath } from '../constants/config'

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
      const searchBox = await getSettingsSearchBox(settings)
      await clearInput(searchBox)
    })

    afterEach(async () => {
      await clearTextSetting(pathToRadBinarySetting)

      await expectStandardSidebarViewsToBeVisible(workbench)
    })

    it('warns the user if the rad binary is not found', async () => {
      await browser.pause(1000)
      await setTextSettingValue(pathToRadBinarySetting, '/tmp')

      await expectRadBinaryNotFoundToBeVisible(workbench)
    })

    it('recognizes the rad binary when a valid path is specified', async () => {
      const tempNodeHomePath = `${nodeHomePath}.temp`
      await $`cp -r ${nodeHomePath} ${tempNodeHomePath}`

      await setTextSettingValue(pathToRadBinarySetting, `/tmp`)

      await expectRadBinaryNotFoundToBeVisible(workbench)

      await setTextSettingValue(pathToRadBinarySetting, `${tempNodeHomePath}/bin/rad`)

      await expectStandardSidebarViewsToBeVisible(workbench)

      await $`rm -rf ${tempNodeHomePath}`
    })

    // This functionality does not seem to work
    // eslint-disable-next-line max-len
    it.skip('recognizes if the directory is created *after* the setting is updated', async () => {
      const tempNodeHomePath = `${nodeHomePath}.temp`

      await setTextSettingValue(pathToRadBinarySetting, tempNodeHomePath)

      await expectRadBinaryNotFoundToBeVisible(workbench)

      await $`cp -r ${nodeHomePath} ${tempNodeHomePath}`

      await expectStandardSidebarViewsToBeVisible(workbench)

      await clearTextSetting(pathToRadBinarySetting)

      await $`rm -rf ${tempNodeHomePath}`
    })
  })

  describe('VS Code, when updating the "Path to Radicle to Node Home" setting,', () => {
    it('displays error in output console', async () => {
      await workbench.executeCommand('Show Everything Logged in the Output Panel')
      const outputView = await workbench.getBottomBar().openOutputView()
      await outputView.clearText()

      // Set the path to a non-existent directory
      const pathToNodeHomeSetting = await settings.findSetting(
        'Path To Node Home',
        'Radicle',
        'Advanced',
      )
      await browser.pause(1000) // TODO: zac check if this is necessary
      await setTextSettingValue(pathToNodeHomeSetting, '/tmp')

      // Assert that the error message is displayed in the output console
      await browser.waitUntil(
        async () => {
          const text = await outputView.getText()
          const joinedText = text.join('')

          console.log({ text, joinedText })

          return joinedText.includes(
            'Found non-authenticated identity ✗ Error: Radicle profile not found in',
          )
        },
        { timeoutMsg: 'expected the error message to be displayed in the output console' },
      )
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

async function clearInput(input: WebdriverIO.Element) {
  await input.setValue('')
  await browser.keys([Key.Ctrl, 'a'])
  await browser.keys(Key.Backspace)
}
