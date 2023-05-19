import { Uri, env, window } from 'vscode'
import type { QuickPickItem } from 'vscode'
import {
  exec,
  getConfigPathToRadBinary,
  isGitInitialised,
  log,
  setConfigPathToRadBinary,
  setWhenClauseContext,
} from '.'

/**
 * Resolves a reference to Radicle CLI to be used for executing shell commands.
 *
 * @returns Either the path to the `rad` binary defined manually by the user via
 * config, or otherwise just the string `"rad"`.
 */
export function getRadCliRef(): string {
  const radCliRef = getConfigPathToRadBinary() || 'rad'

  return radCliRef
}

/**
 * Returns the absolute path to the _resolved_ Radicle CLI binary.
 *
 * @returns The path to the rad binary, if successfully resolved.
 */
export async function getRadCliPath(): Promise<string | undefined> {
  let radCliPath

  if (await isRadCliInstalled()) {
    radCliPath = (
      getConfigPathToRadBinary() ||
      (await exec('which rad', {
        shouldLog: false,
      }))
    )?.trim()
  }

  return radCliPath
}

/**
 * Gets the version of the resolved Radicle CLI binary, if possible in semver format.
 *
 * @returns The version of the Radicle CLI, if successfully resolved.
 */
export async function getRadCliVersion(): Promise<string | undefined> {
  const version = (await exec(`${getRadCliRef()} --version`, { shouldLog: false }))?.trim()
  const semverRegex = /\d+\.\d+\S*/g // https://regexr.com/7bevi
  const semver = version?.match(semverRegex)?.[0]

  return semver ?? version
}

/**
 * Answers whether the Radicle CLI is installed and resolveable on the host OS.
 *
 * @returns `true` if found, otherwise `false`.
 */
export async function isRadCliInstalled(): Promise<boolean> {
  const isInstalled = Boolean(await getRadCliVersion())

  return isInstalled
}

/**
 * Returns a human-friendly message on whether Radicle CLI is installed or not,
 * ready for logging or user notification.
 */
export async function getRadCliStatusMsg(): Promise<string> {
  let msg: string

  if (await isRadCliInstalled()) {
    msg = `Using Radicle CLI v${await getRadCliVersion()} from ${await getRadCliPath()}.`
  } else {
    msg = `Failed resolving Radicle CLI binary. Tried invoking it in the shell as "${getRadCliRef()}".`
  }

  return msg
}

/**
 * Warns the user of failure in resolving Radicle CLI and asks them if they want to resolve the
 * issue.
 *
 * @returns `true` if user opted to resolve the issue, otherwise `false`.
 */
export async function warnUserRadCliNotResolved(): Promise<boolean> {
  const btnResolve = 'Resolve'
  const warnMsgSelection = await window.showWarningMessage(
    "Failed resolving Radicle CLI. Please ensure it is installed on your machine and either that it is globally accessible in the shell as `rad` or that its path is correctly defined in the extension's settings. Please expect the extention's capabilities to remain severely limited until this issue is resolved.",
    btnResolve,
  )

  return warnMsgSelection === btnResolve
}

/**
 * Launches a branching flow of interactive steps helping the user troubleshoot their
 * Radicle CLI installation.
 */
export async function troubleshootRadCliInstallation(): Promise<void> {
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

    fileUriSelection && setConfigPathToRadBinary(fileUriSelection.path)
  }

  if (pathSetMethodSelection === inputBox) {
    const typedInPath = (
      await window.showInputBox({
        title,
        prompt: 'Please enter the path to the Radicle CLI binary stored on your machine.',
        value: getConfigPathToRadBinary(),
        placeHolder: 'For example: /usr/bin/rad',
        validateInput: async (input) => {
          const isPathToRadCli = Boolean(await exec(`${input.trim()} --version`))

          return isPathToRadCli
            ? undefined
            : 'Input must be a valid path to a Radicle CLI binary!'
        },
        ignoreFocusOut: true,
      })
    )?.trim()

    typedInPath && setConfigPathToRadBinary(typedInPath)
  }
}

export async function warnUserRadCliNotResolvedAndMaybeTroubleshoot(): Promise<void> {
  const shouldTroubleshoot = await warnUserRadCliNotResolved()
  shouldTroubleshoot && troubleshootRadCliInstallation()
}

/**
 * Will check if Radicle CLI is installed, log either way, and depending on the
 * workspace state and `minimizeUserNotifications` optional param, might display
 * info or warning notification to the user.
 */
export async function validateRadCliInstallation(
  options: { minimizeUserNotifications: boolean } = { minimizeUserNotifications: false },
): Promise<void> {
  const isRadInstalled = await isRadCliInstalled()
  const msg = await getRadCliStatusMsg()

  setWhenClauseContext('radicle.isRadCliInstalled', isRadInstalled)

  if (isRadInstalled) {
    log(msg, 'info')

    !options.minimizeUserNotifications && window.showInformationMessage(msg)

    return
  }

  log(msg, 'error')

  if (!options.minimizeUserNotifications) {
    warnUserRadCliNotResolvedAndMaybeTroubleshoot()
  } else if (options.minimizeUserNotifications && (await isGitInitialised())) {
    warnUserRadCliNotResolvedAndMaybeTroubleshoot()
  }
}
