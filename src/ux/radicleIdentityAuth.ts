import { InputBoxValidationSeverity, window } from 'vscode'
import { askUser, log, showLog } from '../utils'
import { useEnvStore } from '../stores'
import {
  composeNodeHomePathMsg,
  exec,
  execRad,
  getNodeSshKey,
  getResolvedPathToNodeHome,
  isRadCliInstalled,
  isRadInitialized,
  isRadicleIdentityAuthed,
  isRadicleIdentityKeyEncrypted,
} from '../helpers'

function composeRadAuthSuccessMsg(
  didAction:
    | 'foundUnprotectedId'
    | 'foundUnsealedId'
    | 'didAutoUnlockId'
    | 'didUnlockId'
    | 'didCreatedId',
): string {
  let msgPrefix: string
  switch (didAction) {
    case 'foundUnprotectedId':
      msgPrefix = 'Using non-password-protected'
      break
    case 'foundUnsealedId':
      msgPrefix = 'Using already unsealed'
      break
    case 'didAutoUnlockId':
      msgPrefix = 'Auto-unsealed (using associated passphrase already in Secret Storage) the'
      break
    case 'didUnlockId':
      msgPrefix = 'Succesfully unsealed'
      break
    case 'didCreatedId':
      msgPrefix = 'Succesfully created new'
      break
    default:
      msgPrefix = 'Succesfully authenticated'
  }

  const localIdentityDid = useEnvStore().localIdentity?.DID
  if (!localIdentityDid) {
    throw new Error('Failed resolving radicleId')
  }
  const msg = `${msgPrefix} Radicle identity ${localIdentityDid}${composeNodeHomePathMsg()}`

  return msg
}

function authenticate({ alias, passphrase }: { passphrase: string; alias?: string }): boolean {
  const radAuthCmdSuffix = alias ? `--alias ${alias}` : undefined
  const { errorCode } = execRad(['auth', radAuthCmdSuffix].filter(Boolean), {
    env: { RAD_PASSPHRASE: passphrase },
  })
  if (errorCode) {
    return false
  }

  const localIdentityDid = useEnvStore().localIdentity?.DID
  localIdentityDid && useEnvStore().extCtx.secrets.store(localIdentityDid, passphrase)

  const authSuccessMsg = composeRadAuthSuccessMsg(alias ? 'didCreatedId' : 'didUnlockId')
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
  if (isRadicleIdentityAuthed() || isRadicleIdentityKeyEncrypted() === false) {
    return true
  }

  const localIdentityDid = useEnvStore().localIdentity?.DID
  const secrets = useEnvStore().extCtx.secrets

  /* Attempt automatic authentication */

  // a.k.a. if localIdentityDid already exists
  if (localIdentityDid) {
    const storedPass = await secrets.get(localIdentityDid)

    if (storedPass) {
      const { errorCode } = execRad(['auth'], { env: { RAD_PASSPHRASE: storedPass } })
      if (!errorCode) {
        log(composeRadAuthSuccessMsg('didAutoUnlockId'), 'info')

        return true
      }

      await secrets.delete(localIdentityDid)
      log(
        `Deleted the stored, stale passphrase previously associated with identity ${localIdentityDid}`,
        'warn',
      )
    }
  }

  if (options.minimizeUserNotifications) {
    return false
  }

  /* Notify user that authentication is required */

  const button = 'Authenticate'
  const authStatusMsg = 'You must be authenticated before performing this action.'
  const userSelection = await window.showWarningMessage(authStatusMsg, button)
  if (userSelection !== button) {
    log(`Authentication request was dismissed by the user.`, 'warn')

    return false
  }

  /* Collect credentials and attempt authentication */

  if (localIdentityDid) {
    const answers = await askUser([
      {
        key: 'passphrase',

        title: `Unlocking Radicle identity ${localIdentityDid}`,
        prompt: `Please enter the passphrase used to unlock your Radicle identity.`,
        placeHolder: '************',
        validateInput: (input) => {
          const { errorCode } = execRad(['auth'], { env: { RAD_PASSPHRASE: input } })
          if (errorCode) {
            return "Current input isn't the correct passphrase to unlock the identity."
          }

          exec(`ssh-add -D ${getNodeSshKey('fingerprint')}`)

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
          " Leaving this blank will leave your Radicle identity's key unencrypted.",
        validateInput: (input) => {
          return input
            ? undefined
            : {
                message:
                  "Leaving this blank will leave your Radicle identity's key unencrypted!",
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
        prompt: 'Please re-enter the same passphrase.',
        placeHolder: '************',
        validateInputUsingPreviousAnswers: (input, previousAnswers) => {
          return input === previousAnswers['passphrase']
            ? undefined
            : "Current input isn't matching the passphrase entered in the previous step."
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

  const isIdAuthed = isRadicleIdentityAuthed()
  const isIdentityUnprotected = isRadicleIdentityKeyEncrypted() === false
  if (isIdAuthed || isIdentityUnprotected) {
    const msg = composeRadAuthSuccessMsg(isIdAuthed ? 'foundUnsealedId' : 'foundUnprotectedId')
    log(msg, 'info')
    !options.minimizeUserNotifications && window.showInformationMessage(msg)

    return true
  }

  const localIdentityDid = useEnvStore().localIdentity?.DID
  const pathToNodeHome = getResolvedPathToNodeHome()
  const msg = localIdentityDid
    ? `Found non-authenticated identity ${localIdentityDid} stored in "${pathToNodeHome}"`
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
 * De-authenticates any currently authed Radicle identity by removing the unsealed key from
 * the ssh-agent and the associated stored passphrase (if any) from the extension's
 * Secret Storage.
 *
 * @returns `true` if no identity is currently authed any more, otherwise `false`
 */
export function deAuthCurrentRadicleIdentity(): boolean {
  const sshKey = getNodeSshKey('fingerprint')
  if (!sshKey) {
    const msg = `Failed de-authenticating current Radicle identity because none was found in "${getResolvedPathToNodeHome()}"`
    window.showWarningMessage(msg)
    log(msg, 'warn')

    return true
  }

  const didDeAuth = exec(`ssh-add -D ${sshKey}`, { shouldLog: true }) !== undefined
  const localIdentityDid = useEnvStore().localIdentity?.DID
  if (!didDeAuth) {
    const button = 'Show output'

    const msg = `Failed de-authenticating Radicle identity ${localIdentityDid}${composeNodeHomePathMsg()}.`
    log(msg, 'error')
    window.showErrorMessage(msg, button).then((userSelection) => {
      userSelection === button && showLog()
    })

    return false
  }

  localIdentityDid && useEnvStore().extCtx.secrets.delete(localIdentityDid)

  const msg = `De-authenticated Radicle identity ${localIdentityDid}${composeNodeHomePathMsg()} and removed the associated passphrase from Secret Storage successfully`
  window.showInformationMessage(msg)
  log(msg, 'info')

  return true
}
