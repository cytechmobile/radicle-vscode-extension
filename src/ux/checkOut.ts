import { commands, window } from 'vscode'
import { useEnvStore } from '../stores'
import { exec, execRad } from '../helpers'
import type { Patch } from '../types'
import { log, shortenHash, showLog } from '../utils'

/**
 * Checks out the default Git branch of the Radicle repo currently open in the workspace.
 *
 * @returns A promise that resolves to `true` if successful, otherwise `false`
 */
export function checkOutDefaultBranch(): boolean {
  const defaultBranch = useEnvStore().currentRepo?.defaultBranch
  if (!defaultBranch) {
    return false
  }

  const didCheckoutDefaultBranch =
    exec('git', {
      args: ['checkout', defaultBranch],
      cwd: '$workspaceDir',
      shouldLog: true,
    }) !== undefined
  if (!didCheckoutDefaultBranch) {
    notifyUserGitCheckoutFailed(`Failed checking out branch "${defaultBranch}"`)

    return false
  }

  return true
}

/**
 * Checks out the Git branch associated with the given Radicle `patch`.
 *
 * @returns `true` if successful, otherwise `false`
 */
export function checkOutPatch(patch: Pick<Patch, 'id'>): boolean {
  const { errorCode } = execRad(['patch', 'checkout', patch.id, '--force'], {
    cwd: '$workspaceDir',
    shouldLog: true,
  })
  const didCheckoutPatchBranch = !errorCode
  if (!didCheckoutPatchBranch) {
    notifyUserGitCheckoutFailed(`Failed checking out Patch "${shortenHash(patch.id)}"`)

    return false
  }

  return true
}

function notifyUserGitCheckoutFailed(mainErrorMessage: string) {
  const hasUncommitedChanges =
    exec('u="$(git ls-files --others)" && test -z "$u"', {
      cwd: '$workspaceDir',
    }) === undefined // https://stackoverflow.com/a/2659808/5015955

  const buttonFocusScm = 'Focus Source Control View'
  const buttonShowOutput = 'Show Output'
  const msg = `${mainErrorMessage}${
    hasUncommitedChanges ? '. Please stash or commit your changes and try again.' : ''
  }`
  log(msg, 'error')
  window
    .showErrorMessage(
      msg,
      ...[hasUncommitedChanges ? buttonFocusScm : undefined, buttonShowOutput].filter(Boolean),
    )
    .then((userSelection) => {
      if (userSelection === buttonFocusScm) {
        commands.executeCommand('workbench.view.scm')
      } else if (userSelection === buttonShowOutput) {
        showLog()
      }
    })
}
