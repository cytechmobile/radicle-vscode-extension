import { browser } from '@wdio/globals'
import type { Setting, SettingsEditor, Workbench } from 'wdio-vscode-service'
import isEqual from 'lodash/isEqual'
import { Key } from 'webdriverio'
import { $ } from 'zx'
import { getFirstWelcomeViewText } from '../helpers/queries'
import { expectCliCommandsAndPatchesToBeVisible } from '../helpers/assertions'
import { openRadicleViewContainer } from '../helpers/actions'
import { pathToNodeHome } from '../constants/config'

describe('Settings', () => {
  let workbench: Workbench
  let settings: SettingsEditor
  let pathToRadBinarySetting: Setting

  it('warns the user if the rad binary is not found', async () => {
    workbench = await browser.getWorkbench()
    settings = await workbench.openSettings()
    pathToRadBinarySetting = await settings.findSetting(
      'Path To Rad Binary',
      'Radicle',
      'Advanced',
    )

    await expectCliCommandsAndPatchesToBeVisible(workbench)

    await browser.pause(1000)
    await pathToRadBinarySetting.setValue('/tmp')

    await openRadicleViewContainer(workbench)
    await expectRadBinaryNotFoundToBeVisible(workbench)

    await clearSettingInput(pathToRadBinarySetting)

    await expectCliCommandsAndPatchesToBeVisible(workbench)
  })

  it('recognizes the rad binary when a valid path is specified', async () => {
    const tempNodeHomePath = `${pathToNodeHome}.temp`
    await $`cp -r ${pathToNodeHome} ${tempNodeHomePath}`

    await pathToRadBinarySetting.setValue(`/tmp`)

    await openRadicleViewContainer(workbench)
    await expectRadBinaryNotFoundToBeVisible(workbench)

    await setSettingInputValue(pathToRadBinarySetting, `${tempNodeHomePath}/bin/rad`)

    await expectCliCommandsAndPatchesToBeVisible(workbench)

    await $`rm -rf ${tempNodeHomePath}`

    await clearSettingInput(pathToRadBinarySetting)

    await expectCliCommandsAndPatchesToBeVisible(workbench)
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

async function clearSettingInput(setting: Setting) {
  const inputValue = await setting.getValue()
  console.log({ inputValue })

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

async function setSettingInputValue(setting: Setting, value: string) {
  await clearSettingInput(setting)
  await setting.setValue(value)
}
