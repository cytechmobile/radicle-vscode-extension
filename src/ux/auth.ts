import { window } from 'vscode'
import { exec, log } from '../utils'
import { getExtensionContext } from '../store'
import {
  getDefaultPathToNodeHome,
  getRadCliRef,
  getRadNodeSshKey,
  getRadicleIdentity,
  getResolvedPathToNodeHome,
  isRadCliAuthed,
  isRadCliInstalled,
  isRepoRadInitialised,
} from '../helpers'

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
