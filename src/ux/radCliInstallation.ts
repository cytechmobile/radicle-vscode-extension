import { type QuickPickItem, Uri, env, window } from 'vscode'
import {
  getConfig,
  getRadCliPath,
  getRadCliRef,
  getRadCliVersion,
  isRadCliInstalled,
  setConfig,
} from '../helpers'
import { exec, isGitRepo, log, setWhenClauseContext } from '../utils'

/**
 * Warns the user of failure in resolving Radicle CLI and asks them if they want to resolve the
 * issue.
 *
 * @returns `true` if user opted to resolve the issue, otherwise `false`.
 */
async function notifyUserRadCliNotResolved(): Promise<boolean> {
  const button = 'Troubleshoot'
  const userSelection = await window.showErrorMessage(
    "Failed resolving Radicle CLI. Please ensure it is installed on your machine and either that it is globally accessible in the shell as `rad` or that its path is correctly defined in the extension's settings. Please expect the extention's capabilities to remain severely limited until this issue is resolved.",
    button,
  )

  return userSelection === button
}

/**
 * Launches a branching flow of interactive steps helping the user troubleshoot their
 * Radicle CLI installation.
 */
async function troubleshootRadCliInstallation(): Promise<void> {
  const title = 'Radicle CLI Installation Troubleshooter'
  const no = "No, I haven't"
  const yes = 'Yes, I have'
  const cliInstalledSelection = await window.showQuickPick(
    [
      {
        label: no,
        detail: '$(link-external) Opens the Getting Started guide in your browser',
      },
      {
        label: yes,
        detail: "$(settings-gear) Let's you manually set the path to the Radicle CLI binary",
      },
    ] satisfies QuickPickItem[],
    {
      title,
      placeHolder: 'Have you already installed the Radicle CLI on your machine?',
      ignoreFocusOut: true,
    },
  )

  if (cliInstalledSelection?.label === no) {
    env.openExternal(Uri.parse('https://radicle.xyz/get-started.html'))

    return
  }

  if (cliInstalledSelection?.label !== yes) {
    return
  }

  const filePicker = '$(folder-opened) Browse filesystem using file picker'
  const inputBox = '$(edit) Enter path in input box'
  const pathSetMethodSelection = await window.showQuickPick([filePicker, inputBox], {
    title,
    placeHolder: 'How do you prefer to set the path to the Radicle CLI binary?',
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
        prompt: 'Please enter the path to the Radicle CLI binary stored on your machine.',
        value: getConfig('radicle.advanced.pathToRadBinary'),
        placeHolder: 'For example: /usr/bin/rad',
        validateInput: async (input) => {
          const isPathToRadCli = Boolean(
            await exec(`${input.trim()} --version`, { shouldLog: true }),
          )

          return isPathToRadCli
            ? undefined
            : 'Input must be a valid path to a Radicle CLI binary!'
        },
        ignoreFocusOut: true,
      })
    )?.trim()

    typedInPath && setConfig('radicle.advanced.pathToRadBinary', typedInPath)
  }
}

/**
 * Notifies the user if the Radicle CLI binary is not resolved and, if so, prompts them
 * to troubleshoot.
 */
export async function notifyUserRadCliNotResolvedAndMaybeTroubleshoot(): Promise<void> {
  const shouldTroubleshoot = await notifyUserRadCliNotResolved()
  shouldTroubleshoot && troubleshootRadCliInstallation()
}

/**
 * Will check if Radicle CLI is installed, log either way, and depending on the
 * workspace state and `minimizeUserNotifications` optional param, might display
 * info or warning notification to the user.
 *
 * @returns `true` if CLI was installed at calling time, `false` otherwise (regardless if the
 * user ubsequently resolves the issue using the troubleshooting flow)
 */
export async function validateRadCliInstallation(
  options: { minimizeUserNotifications: boolean } = { minimizeUserNotifications: false },
): Promise<boolean> {
  const isRadInstalled = await isRadCliInstalled()
  setWhenClauseContext('radicle.isRadCliInstalled', isRadInstalled)

  if (isRadInstalled) {
    const msg = `Using Radicle CLI v${await getRadCliVersion()} from "${await getRadCliPath()}"`

    log(msg, 'info')
    !options.minimizeUserNotifications && window.showInformationMessage(msg)

    return true
  }

  log(
    `Failed resolving Radicle CLI binary. Tried invoking it in the shell as "${await getRadCliRef()}".`,
    'error',
  )

  if (!options.minimizeUserNotifications || (await isGitRepo())) {
    notifyUserRadCliNotResolvedAndMaybeTroubleshoot()
  }

  return false
}
