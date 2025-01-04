import { browser } from '@wdio/globals'
import type { OutputView, Setting, SettingsEditor } from 'wdio-vscode-service'
import { Key } from 'webdriverio'
import { $ } from 'zx'
import { nodeHomePath } from '../constants/config'

describe('Httpd', () => {
  it('receives success responses from httpd', async () => {
    const workbench = await browser.getWorkbench()
    await workbench.executeCommand('Show Everything Logged in the Output Panel')
    const outputView = await workbench.getBottomBar().openOutputView()

    const settings = await workbench.openSettings()
    const pathToNodeHomeSetting = await settings.findSetting(
      'Path To Node Home',
      'Radicle',
      'Advanced',
    )

    await browser.waitUntil(async () => {
      await setTextSettingValue(pathToNodeHomeSetting, nodeHomePath ?? '')

      return (await getTextSettingValue(pathToNodeHomeSetting)) === nodeHomePath
    })

    const radSelf = await $`rad self`
    console.log({ radSelf })

    await expectOutputToContain(outputView, 'Using already unsealed Radicle identity')
  })
})

async function expectOutputToContain(outputView: OutputView, expected: string) {
  await browser.waitUntil(
    async () => {
      /**
       * The text in the output console is split by newlines, which can be affected by the size
       * of the window. To avoid this, we join the text into a single string.
       */
      const joinedText = (await outputView.getText()).join('')
      console.log({ joinedText })

      return joinedText.includes(expected)
    },
    {
      timeoutMsg: `expected the output text to contain "${expected}"`,
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
