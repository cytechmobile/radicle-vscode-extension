import { type QuickPickItem, Uri, env, window } from 'vscode'
import {
  exec,
  getAbsolutePathToDefaultRadBinaryDirectory,
  getConfig,
  getRadCliVersion,
  setConfig,
} from '../helpers'
import { isRealFsPath, log, setWhenClauseContext } from '../utils'
import { useEnvStore } from '../stores'

/**
 * Launches a branching flow of interactive steps helping the user troubleshoot their
 * Radicle CLI installation.
 */
export async function troubleshootRadCliInstallation(): Promise<void> {
  const title = 'Radicle CLI Installation Troubleshooter'
  const no = "No, I haven't installed the Radicle CLI"
  const yes = 'Yes, I have already installed Radicle CLI'
  const cliInstalledSelection = await window.showQuickPick(
    [
      {
        label: no,
        detail: '$(link-external) Opens the Installation Guide in your browser',
      },
      {
        label: yes,
        detail: "$(settings-gear) Let's you manually set the path to the Radicle CLI binary",
      },
    ] satisfies QuickPickItem[],
    {
      title,
      placeHolder:
        'Have you already installed the Radicle CLI (a.k.a. `rad`) on your machine?',
      ignoreFocusOut: true,
    },
  )

  if (cliInstalledSelection?.label === no) {
    env.openExternal(Uri.parse('https://radicle.xyz/#get-started'))

    return
  }

  if (cliInstalledSelection?.label !== yes) {
    return
  }

  const filePicker = '$(folder-opened) Browse filesystem using file picker'
  const inputBox = '$(edit) Enter path in input box'
  const pathSetMethodSelection = await window.showQuickPick([filePicker, inputBox], {
    title,
    placeHolder:
      'How do you prefer telling me the location of the Radicle CLI binary on your machine?',
    ignoreFocusOut: true,
  })

  if (pathSetMethodSelection === filePicker) {
    const fileUriSelection = (
      await window.showOpenDialog({
        title,
        openLabel: 'Select',
        canSelectMany: false,
      })
    )?.[0]

    fileUriSelection &&
      (await setConfig('radicle.advanced.pathToRadBinary', fileUriSelection.path))
  }

  if (pathSetMethodSelection === inputBox) {
    const typedInPath = (
      await window.showInputBox({
        title,
        prompt:
          'Please enter the absolute path to the Radicle CLI binary stored on your machine.',
        value: getConfig('radicle.advanced.pathToRadBinary'),
        placeHolder: `For example: ${getAbsolutePathToDefaultRadBinaryDirectory()}`,
        validateInput: (input) => {
          const trimmedInput = input.trim()
          const isPathToRadCli =
            isRealFsPath(trimmedInput) &&
            exec(trimmedInput, { shouldLog: true })?.startsWith('rad ')

          return isPathToRadCli
            ? undefined
            : "Input isn't a valid path to a known Radicle CLI binary."
        },
        ignoreFocusOut: true,
      })
    )?.trim()

    typedInPath && setConfig('radicle.advanced.pathToRadBinary', typedInPath)
  }
}

/**
 * Will check if Radicle CLI is installed, log either way, and depending on the
 * workspace state and `minimizeUserNotifications` optional param, may notify the user of
 * the result.
 *
 * @returns `true` if CLI was installed at calling time, `false` otherwise (regardless if the
 * user ubsequently resolves the issue using the troubleshooting flow)
 */
export function validateRadCliInstallation(
  options: { minimizeUserNotifications: boolean } = { minimizeUserNotifications: false },
): boolean {
  const radVersion = getRadCliVersion()
  const isRadInstalled = Boolean(radVersion)
  setWhenClauseContext('radicle.isRadCliInstalled', isRadInstalled)
  // TODO: maninak remove these when isRadInstalled is in a store and make them depend on isRadInstalled
  isRadInstalled && useEnvStore().refreshCurrentRepoId()

  const radPath = useEnvStore().resolvedAbsolutePathToRadBinary

  if (isRadInstalled) {
    const msg = `Using Radicle CLI v${radVersion} from "${radPath}"`
    log(msg, 'info')
    !options.minimizeUserNotifications && window.showInformationMessage(msg)

    return true
  }

  log(`Failed resolving Radicle CLI binary. Tried spawning it from "${radPath}".`, 'error')

  return false
}
