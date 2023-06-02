import { window } from 'vscode'
import { exec, log, showLog } from '../utils'
import { getExtensionContext } from '../store'
import {
  composeNodePathMsg,
  getRadCliRef,
  getRadNodeSshKey,
  getRadicleIdentity,
  getResolvedPathToNodeHome,
  isRadCliAuthed,
  isRadCliInstalled,
  isRepoRadInitialised,
} from '../helpers'

async function composeRadAuthSuccessMsg(
  didAction: 'foundUnlockedId' | 'autoUnlockedId' | 'unlockedId' | 'createdId',
): Promise<string> {
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
  const radicleId = await getRadicleIdentity('DID')

  const msg = `${msgPrefix} Radicle identity "${radicleId}"${await composeNodePathMsg()}`

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
        log(await composeRadAuthSuccessMsg('autoUnlockedId'), 'info')

        return true
      }

      secrets.delete(radicleId)
      log(
        `Deleted the stored, stale passphrase previously associated with identity "${radicleId}"`,
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

        const didAuth = await exec(
          `RAD_PASSPHRASE=${input.trim()} ${await getRadCliRef()} auth`,
        )
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

  const authSuccessMsg = await composeRadAuthSuccessMsg(radicleId ? 'unlockedId' : 'createdId')
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
    const msg = await composeRadAuthSuccessMsg('foundUnlockedId')
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

/**
 * De-authenticates any currently authed Radicle identity by removing the unlocked key from
 * the ssh-agent and the associated stored passphrase (if any) from the extension's
 * Secret Storage.
 *
 * @returns `true` if no identity is currently authed any more, otherwise `false`
 */
export async function deAuthCurrentRadicleIdentity(): Promise<boolean> {
  const sshKey = await getRadNodeSshKey('hash')
  if (!sshKey) {
    const msg = `Failed de-authenticating current Radicle identity because none was found in "${await getResolvedPathToNodeHome()}"`
    window.showWarningMessage(msg)
    log(msg, 'warn')

    return true
  }

  const didDeAuth = (await exec(`ssh-add -D ${sshKey}`, { shouldLog: true })) !== undefined
  const radicleId = await getRadicleIdentity('DID')
  getExtensionContext().secrets.delete(radicleId ?? '')

  if (!didDeAuth) {
    const button = 'Show output'
    const msg = `Failed de-authenticating Radicle identity (DID) "${radicleId}"${await composeNodePathMsg()}.`
    window
      .showErrorMessage(msg, button)
      .then((userSelection) => userSelection === button && showLog())
    log(msg, 'error')

    return false
  }

  const msg = `De-authenticated Radicle identity (DID) "${radicleId}"${await composeNodePathMsg()} and removed the associated passphrase from Secret Storage successfully`
  window.showInformationMessage(msg)
  log(msg, 'info')

  return true
}
