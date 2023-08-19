import { InputBoxValidationSeverity, window } from 'vscode'
import { askUser, exec, log, showLog } from '../utils'
import { getExtensionContext } from '../store'
import {
  composeNodeHomePathMsg,
  getRadCliRef,
  getRadNodeSshKey,
  getRadicleIdentity,
  getResolvedPathToNodeHome,
  isRadCliInstalled,
  isRadInitialized,
  isRadicleIdentityAuthed,
} from '../helpers'

function composeRadAuthSuccessMsg(
  didAction: 'foundUnlockedId' | 'autoUnlockedId' | 'unlockedId' | 'createdId',
): string {
  let msgPrefix: string
  switch (didAction) {
    case 'foundUnlockedId':
      msgPrefix = 'Using already unlocked'
      break
    case 'autoUnlockedId':
      msgPrefix = 'Auto-unlocked (using associated passphrase already in Secret Storage) the'
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
  const radicleId = getRadicleIdentity('DID')
  if (!radicleId) {
    throw new Error('Failed resolving radicleId')
  }

  const msg = `${msgPrefix} Radicle identity "${radicleId}"${composeNodeHomePathMsg()}`

  return msg
}

function authenticate({ alias, passphrase }: { alias?: string; passphrase: string }): boolean {
  const radAuthCmdSuffix = alias ? `--alias ${alias}` : ''
  const didAuth = exec(`${getRadCliRef()} auth ${radAuthCmdSuffix}`, {
    env: { RAD_PASSPHRASE: passphrase },
  })
  if (!didAuth) {
    return false
  }

  const newRadicleId = getRadicleIdentity('DID')
  newRadicleId && getExtensionContext().secrets.store(newRadicleId, passphrase)

  const authSuccessMsg = composeRadAuthSuccessMsg(alias ? 'createdId' : 'unlockedId')
  log(authSuccessMsg, 'info')
  window.showInformationMessage(authSuccessMsg)

  return true
}

/**
 * Attempts to authenticate a Radicle identity using either the the stored (if any) passphrasse
 * or (if `minimizeUserNotifications` options is `false`) the one the user will manually type
 * in.
 *
 * @returns `true` if an identity is authenticated by the end of the call, otherwise `false`.
 */
export async function launchAuthenticationFlow(
  options: { minimizeUserNotifications: boolean } = { minimizeUserNotifications: false },
): Promise<boolean> {
  if (isRadicleIdentityAuthed()) {
    return true
  }

  const radicleId = getRadicleIdentity('DID')
  const radicleIdAlreadyExists = Boolean(radicleId)
  const secrets = getExtensionContext().secrets

  /* Attempt automatic authentication */

  // a.k.a. `if (radicleIdAlreadyExists)`, but TS ain't understanding it's the same
  if (radicleId) {
    const storedPass = await secrets.get(radicleId)

    if (storedPass) {
      const didAuth = exec(`${getRadCliRef()} auth`, { env: { RAD_PASSPHRASE: storedPass } })
      if (didAuth) {
        log(composeRadAuthSuccessMsg('autoUnlockedId'), 'info')

        return true
      }

      await secrets.delete(radicleId)
      log(
        `Deleted the stored, stale passphrase previously associated with identity "${radicleId}"`,
        'warn',
      )
    }
  }

  if (options.minimizeUserNotifications) {
    return false
  }

  /* Notify user that authentication is required */

  const button = 'Authenticate'
  const authStatusMsg = 'You need to be authenticated before performing this action'
  const userSelection = await window.showErrorMessage(authStatusMsg, button)
  if (userSelection !== button) {
    return false
  }

  /* Collect credentials and attempt authentication */

  if (radicleIdAlreadyExists) {
    const answers = await askUser([
      {
        key: 'passphrase',
        title: `Unlocking Radicle identity "${radicleId}"`,
        prompt: `Please enter the passphrase used to unlock your Radicle identity.`,
        placeHolder: '************',
        validateInput: (input) => {
          const didAuth = exec(`${getRadCliRef()} auth`, { env: { RAD_PASSPHRASE: input } })
          if (!didAuth) {
            return "Current input isn't the correct passphrase to unlock the identity."
          }

          exec(`ssh-add -D ${getRadNodeSshKey('fingerprint')}`)

          return undefined
        },
        password: true,
        ignoreFocusOut: true,
        kind: 'text',
      },
    ])
    if (!answers) {
      const msg = 'Radicle authentication was aborted by the user'
      log(msg, 'info')
      window.showWarningMessage(msg)

      return false
    }

    const didAuth = authenticate(answers)

    return didAuth
  } else {
    const title = 'Creating new Radicle identity'
    const answers = await askUser([
      {
        key: 'alias',
        title,
        prompt: 'Please enter the alias of your new identity. You can always change it later.',
        value: process.env['USER'],
        validateInput: (input) => {
          return input ? undefined : 'The input cannot be empty.'
        },
        ignoreFocusOut: true,
        kind: 'text',
      },
      {
        key: 'passphrase',
        title,
        prompt:
          'Please enter a passphrase used to protect your new Radicle identity.' +
          ' Leaving this blank will keep your Radicle key unencrypted.',
        validateInput: (input) => {
          return input
            ? undefined
            : {
                message: 'Leaving this blank will keep your Radicle key unencrypted!',
                severity: InputBoxValidationSeverity.Warning,
              }
        },
        placeHolder: '************',
        password: true,
        ignoreFocusOut: true,
        kind: 'text',
      },
      {
        key: 'passphrase-repeat',
        title,
        prompt: 'Please enter the same passphrase once again.',
        placeHolder: '************',
        validateInputUsingPreviousAnswers: (input, answers) => {
          return input === answers['passphrase']
            ? undefined
            : "Current input isn't matching the passphrase entered in the previous step."
        },
        password: true,
        ignoreFocusOut: true,
        kind: 'text',
      },
    ])
    if (!answers) {
      const msg = 'Radicle authentication got aborted by the user'
      log(msg, 'info')
      window.showWarningMessage(msg)

      return false
    }

    const didAuth = authenticate(answers)

    return didAuth
  }
}

/**
 * Will check if a Radicle identity is authenticated, log either way, and depending on the
 * `minimizeUserNotifications` optional param, may notify the user of the result,
 * including asking them to type in an authenticating passphrase.
 *
 * @returns `true` if an identity is authenticated by the end of the call, otherwise `false`.
 */
export async function validateRadicleIdentityAuthentication(
  options: { minimizeUserNotifications: boolean } = { minimizeUserNotifications: false },
): Promise<boolean> {
  if (!isRadCliInstalled()) {
    return false
  }

  if (isRadicleIdentityAuthed()) {
    const msg = composeRadAuthSuccessMsg('foundUnlockedId')
    log(msg, 'info')
    !options.minimizeUserNotifications && window.showInformationMessage(msg)

    return true
  }

  const radicleId = getRadicleIdentity('DID')
  const pathToNodeHome = getResolvedPathToNodeHome()
  const msg = radicleId
    ? `Found non-authenticated identity "${radicleId}" stored in "${pathToNodeHome}"`
    : `No Radicle identity is currently stored in "${pathToNodeHome}"`
  log(msg, 'warn')

  if (!options.minimizeUserNotifications || isRadInitialized()) {
    return await launchAuthenticationFlow({
      minimizeUserNotifications: options.minimizeUserNotifications,
    })
  }

  return false
}

/**
 * De-authenticates any currently authed Radicle identity by removing the unlocked key from
 * the ssh-agent and the associated stored passphrase (if any) from the extension's
 * Secret Storage.
 *
 * @returns `true` if no identity is currently authed any more, otherwise `false`
 */
export function deAuthCurrentRadicleIdentity(): boolean {
  const sshKey = getRadNodeSshKey('fingerprint')
  if (!sshKey) {
    const msg = `Failed de-authenticating current Radicle identity because none was found in "${getResolvedPathToNodeHome()}"`
    window.showWarningMessage(msg)
    log(msg, 'warn')

    return true
  }

  const didDeAuth = exec(`ssh-add -D ${sshKey}`, { shouldLog: true }) !== undefined
  const radicleId = getRadicleIdentity('DID')
  if (!didDeAuth) {
    const button = 'Show output'
    const msg = `Failed de-authenticating Radicle identity (DID) "${radicleId}"${composeNodeHomePathMsg()}.`
    window.showErrorMessage(msg, button).then((userSelection) => {
      userSelection === button && showLog()
    })
    log(msg, 'error')

    return false
  }

  radicleId && getExtensionContext().secrets.delete(radicleId)

  const msg = `De-authenticated Radicle identity (DID) "${radicleId}"${composeNodeHomePathMsg()} and removed the associated passphrase from Secret Storage successfully`
  window.showInformationMessage(msg)
  log(msg, 'info')

  return true
}
