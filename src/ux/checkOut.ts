import { window } from 'vscode'
import { useGitStore } from '../stores'
import { getRadCliRef } from '../helpers'
import type { Patch } from '../types'
import { exec, log, shortenHash, showLog } from '../utils'

/**
 * Checks out the default Git branch of the Radicle repo currently open in the workspace.
 *
 * @returns A promise that resolves to `true` if successful, otherwise `false`
 */
export async function checkOutDefaultBranch(): Promise<boolean> {
  const defaultBranch = (await useGitStore().getRepoInfo())?.defaultBranch
  if (!defaultBranch) {
    return false
  }

  const didCheckoutDefaultBranch =
    exec(`git checkout ${defaultBranch}`, { cwd: '$workspaceDir', shouldLog: true }) !==
    undefined
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
  const didCheckoutPatchBranch = Boolean(
    exec(`${getRadCliRef()} patch checkout ${patch.id} --force`, {
      cwd: '$workspaceDir',
      shouldLog: true,
    }),
  )
  if (!didCheckoutPatchBranch) {
    notifyUserGitCheckoutFailed(`Failed checking out Patch "${shortenHash(patch.id)}"`)

    return false
  }

  return true
}

function notifyUserGitCheckoutFailed(mainErrorMessage: string) {
  const hasUncommitedChanges =
    exec('git update-index --refresh && git diff-index --quiet HEAD --', {
      cwd: '$workspaceDir',
    }) === undefined // https://stackoverflow.com/a/3879077/5015955

  const button = 'Show output'
  const msg = `${mainErrorMessage}${
    hasUncommitedChanges ? '. Please stash or commit your changes and try again.' : ''
  }`
  log(msg, 'error')
  window.showErrorMessage(msg, button).then((userSelection) => {
    userSelection === button && showLog()
  })
}
