import { browser } from '@wdio/globals'
import type { Setting, Workbench } from 'wdio-vscode-service'
import isEqual from 'lodash/isEqual'
import { Key } from 'webdriverio'
import { getFirstWelcomeViewText } from '../helpers/queries'
import { expectCliCommandsAndPatchesToBeVisible } from '../helpers/assertions'
import { openRadicleViewContainer } from '../helpers/actions'

describe('Settings', () => {
  it('warns the user if the rad binary is not found', async () => {
    const workbench = await browser.getWorkbench()
    const settings = await workbench.openSettings()
    const pathToRadBinarySetting = await settings.findSetting(
      'Path To Rad Binary',
      'Radicle',
      'Advanced',
    )

    await openRadicleViewContainer(workbench)
    await expectCliCommandsAndPatchesToBeVisible(workbench)

    await browser.pause(1000)
    await pathToRadBinarySetting.setValue('/tmp')

    await expectRadBinaryNotFoundToBeVisible(workbench)

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
    },
  )
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
