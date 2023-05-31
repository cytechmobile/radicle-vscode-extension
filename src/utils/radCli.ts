import { type QuickPickItem, Uri, env, window } from 'vscode'
import { getExtensionContext } from '../store'
import {
  exec,
  getConfig,
  getDefaultPathToNodeHome,
  getResolvedPathToNodeHome,
  getValidatedAliasedPathToRadBinary,
  getValidatedDefaultPathToRadBinary,
  isGitInitialised,
  isRepoRadInitialised,
  log,
  setConfig,
  setWhenClauseContext,
} from '.'

/**
 * Resolves a reference to Radicle CLI to be used for executing shell commands.
 *
 * @returns Either the path to the `rad` binary defined manually by the user via
 * config, or otherwise just the string `"rad"`.
 */
export async function getRadCliRef(): Promise<string> {
  const configPathToNodeHome = getConfig('radicle.advanced.pathToNodeHome')
  const envPathToNodeHome = configPathToNodeHome && `RAD_HOME=${configPathToNodeHome}`
  const envVars = [envPathToNodeHome]
  const parsedEnvVars = envVars.filter(Boolean).length ? `${envVars.join(' ')} ` : ''

  const radCliRef =
    getConfig('radicle.advanced.pathToRadBinary') ||
    (Boolean(await getValidatedAliasedPathToRadBinary()) && 'rad') ||
    (await getValidatedDefaultPathToRadBinary())
  const radCliRefWithEnvVars = `${parsedEnvVars}${radCliRef}`

  return radCliRefWithEnvVars
}

/**
 * Returns the absolute path to the _resolved_ Radicle CLI binary.
 *
 * @returns The path to the rad binary, if successfully resolved.
 */
export async function getRadCliPath(): Promise<string | undefined> {
  let radCliPath: string | undefined

  if (await isRadCliInstalled()) {
    radCliPath =
      getConfig('radicle.advanced.pathToRadBinary') ||
      (await getValidatedDefaultPathToRadBinary()) ||
      (await getValidatedAliasedPathToRadBinary())
  }

  return radCliPath
}

/**
 * Gets the version of the resolved Radicle CLI binary, if possible in semver format.
 *
 * @returns The version of the Radicle CLI, if successfully resolved.
 */
export async function getRadCliVersion(): Promise<string | undefined> {
  const version = await exec(`${await getRadCliRef()} --version`)
  const semverRegex = /\d+\.\d+\S*/g // https://regexr.com/7bevi
  const semver = version?.match(semverRegex)?.[0]

  return semver ?? version
}

export async function getRadicleIdentity(format: 'DID' | 'NID'): Promise<string | undefined> {
  const radSelf = await exec(`${await getRadCliRef()} self`)
  if (!radSelf) {
    return undefined
  }

  const radicleIdFromRadSelfRegex =
    format === 'DID' ? /DID\s+(\S+)/g : /Node ID \(NID\)\s+(\S+)/g // https://regexr.com/7eam1
  const id = [...radSelf.matchAll(radicleIdFromRadSelfRegex)]?.[0]?.[1]

  return id
}

export async function getRadNodeSshKey(format: 'hash' | 'full'): Promise<string | undefined> {
  const radSelf = await exec(`${await getRadCliRef()} self`)
  const keyFromRadSelfRegex =
    format === 'hash' ? /Key \(hash\)\s+(\S+)/g : /Key \(full\)\s+(\S+ \S+)/g // https://regexr.com/7eaeh
  const key = [...(radSelf ?? '').matchAll(keyFromRadSelfRegex)]?.[0]?.[1]

  return key
}

export async function getRadNodeStoragePath(): Promise<string | undefined> {
  const radSelf = await exec(`${await getRadCliRef()} self`)
  if (!radSelf) {
    return undefined
  }

  const radNodeStoragePath = [...radSelf.matchAll(/Storage \(git\)\s+(\S+)/g)]?.[0]?.[1] // https://regexr.com/7eam1

  return radNodeStoragePath
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
 * Answers whether the Radicle node has a currently authenticated identity or not. The identity
 * must be fully accessible to the Radicle CLI, i.e. the key must have also been added to the
 * ssh-agent.
 *
 * @returns `true` if authenticated, otherwise `false`.
 */
export async function isRadCliAuthed(): Promise<boolean> {
  const radicleId = await getRadNodeSshKey('hash')
  const unlockedIds = await exec('ssh-add -l')
  if (!radicleId || !unlockedIds) {
    return false
  }

  const isAuthed = Boolean(unlockedIds?.includes(radicleId))

  return isAuthed
}

/**
 * Warns the user of failure in resolving Radicle CLI and asks them if they want to resolve the
 * issue.
 *
 * @returns `true` if user opted to resolve the issue, otherwise `false`.
 */
export async function notifyUserRadCliNotResolved(): Promise<boolean> {
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

  if (!options.minimizeUserNotifications || (await isGitInitialised())) {
    notifyUserRadCliNotResolvedAndMaybeTroubleshoot()
  }

  return false
}

async function getRadAuthSuccessMsg(
  didAction: 'foundUnlockedId' | 'autoUnlockedId' | 'unlockedId' | 'createdId',
): Promise<string> {
  const resolvedPathToNodeHome = await getResolvedPathToNodeHome()
  const isResolvedPathToNodeHomeTheDefaultOne =
    resolvedPathToNodeHome === (await getDefaultPathToNodeHome())
  const nodePathMsg = isResolvedPathToNodeHomeTheDefaultOne
    ? ''
    : ` stored in "${resolvedPathToNodeHome}"`

  let msgPrefix: string
  switch (didAction) {
    case 'foundUnlockedId':
      msgPrefix = 'Using already unlocked'
      break
    case 'autoUnlockedId':
      msgPrefix = 'Auto-unlocked (using securely stored passphrase) the'
      break
    case 'unlockedId':
      msgPrefix = 'Succesfully unlocked'
      break
    case 'createdId':
      msgPrefix = 'Succesfully created new'
      break
    default:
      msgPrefix = 'Succesfully authenticated'
  }

  const radicleId = await getRadicleIdentity('DID')

  const msg = `${msgPrefix} Radicle identity "${radicleId}"${nodePathMsg}`

  return msg
}

export async function authenticate(
  options: { minimizeUserNotifications: boolean } = { minimizeUserNotifications: false },
): Promise<boolean> {
  if (await isRadCliAuthed()) {
    return true
  }

  const radicleId = await getRadicleIdentity('DID')
  const secrets = getExtensionContext().secrets

  /* Attempt automatic authentication */
  if (radicleId) {
    const storedPass = await secrets.get(radicleId)

    if (storedPass) {
      const didAuth = await exec(`RAD_PASSPHRASE=${storedPass} ${await getRadCliRef()} auth`)
      if (didAuth) {
        log(await getRadAuthSuccessMsg('autoUnlockedId'), 'info')

        return true
      }

      secrets.delete(radicleId)
      log(
        `Deleted stale passphrase (from secure store) previously matching Radicle identity "${radicleId}"`,
        'warn',
      )
    }
  }

  if (options.minimizeUserNotifications) {
    return false
  }

  /* Notify that authentication is required */
  const button = 'Authenticate'
  const authStatusMsg = 'You need to be authenticated before performing this action'
  const userSelection = await window.showErrorMessage(authStatusMsg, button)
  if (userSelection !== button) {
    return false
  }

  /* Attempt manual user authentication */
  const title = radicleId
    ? `Unlocking Radicle identity "${radicleId}"`
    : 'Creating new Radicle identity'
  const prompt = radicleId
    ? `Please enter the passphrase used to unlock your Radicle identity.`
    : 'Please enter a passphrase used to protect your new Radicle identity.'
  const typedInRadPass = (
    await window.showInputBox({
      title,
      prompt,
      placeHolder: '************',
      validateInput: async (input) => {
        if (!radicleId) {
          return undefined
        }

        const didAuth = await exec(`RAD_PASSPHRASE=${input} ${await getRadCliRef()} auth`)
        if (!didAuth) {
          return "Current input isn't the correct passphrase to unlock the identity"
        }

        exec(`ssh-add -D ${getRadNodeSshKey('hash')}`)

        return undefined
      },
      password: true,
      ignoreFocusOut: true,
    })
  )?.trim()
  if (typedInRadPass === undefined) {
    const msg = 'Radicle authentication was aborted'
    log(msg, 'info')
    window.showWarningMessage(msg)

    return false
  }

  /* Authenticate for real now that we have a confirmed passphrase */
  const didAuth = await exec(`RAD_PASSPHRASE=${typedInRadPass} ${await getRadCliRef()} auth`)
  if (!didAuth) {
    return false
  }

  secrets.store((await getRadicleIdentity('DID')) as string, typedInRadPass)

  const authSuccessMsg = await getRadAuthSuccessMsg(radicleId ? 'unlockedId' : 'createdId')
  log(authSuccessMsg, 'info')
  window.showInformationMessage(authSuccessMsg)

  return true
}

// TODO: maninak document this and ALL other exported funcs without docs
export async function validateRadCliAuthentication(
  options: { minimizeUserNotifications: boolean } = { minimizeUserNotifications: false },
): Promise<boolean> {
  if (await !isRadCliInstalled()) {
    return false
  }

  if (await isRadCliAuthed()) {
    const msg = await getRadAuthSuccessMsg('foundUnlockedId')
    log(msg, 'info')
    !options.minimizeUserNotifications && window.showInformationMessage(msg)

    return true
  }

  const radicleId = await getRadicleIdentity('DID')
  const msg = radicleId
    ? `Found non-authenticated identity "${radicleId}" stored in "${await getResolvedPathToNodeHome()}"`
    : `No Radicle identity is currently stored in "${await getResolvedPathToNodeHome()}"`
  log(msg, 'warn')

  if (!options.minimizeUserNotifications || (await isRepoRadInitialised())) {
    return await authenticate({ minimizeUserNotifications: options.minimizeUserNotifications })
  }

  return false
}
