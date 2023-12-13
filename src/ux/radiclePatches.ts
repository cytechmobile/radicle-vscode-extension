import { window } from 'vscode'
import { getRadCliRef } from '../helpers'
import type { Patch } from '../types'
import { exec, log, shortenHash, showLog } from '../utils'

export function checkOutPatch(patch: Patch): void {
  const didCheckoutPatch = Boolean(
    exec(`${getRadCliRef()} patch checkout ${patch.id}`, {
      cwd: '$workspaceDir',
      shouldLog: true,
    }),
  )
  if (!didCheckoutPatch) {
    const hasUncommitedChanges =
      exec('git update-index --refresh && git diff-index --quiet HEAD --', {
        cwd: '$workspaceDir',
      }) === undefined // https://stackoverflow.com/a/3879077/5015955

    const button = 'Show output'
    const msg = `Failed checking out Patch "${shortenHash(patch.id)}".${
      hasUncommitedChanges ? ' Please stash or commit your changes first.' : ''
    }`
    window.showErrorMessage(msg, button).then((userSelection) => {
      userSelection === button && showLog()
    })
    log(msg, 'error')
  }

  // TODO: if we ever use a proper reactive global store like pinia, where we store all
  // current patches, we should just do a
  // patchesRefreshEventEmitter.fire(patchesStore.patches.findById(curPatch))
  // and
  // patchesRefreshEventEmitter.fire(patch)
  // so that we only update two items in place instead of triggering a fresh
  // fetch and parse and render of all patches.
  // We should also similarly adjust the fileWatcher of .git/HEAD to only update the
  // current branch in the global store and any subscribers of that should react as needed
  // (again, not refetching everything every time the HEAD changes!). Also get any current
  // callers of getCurrentGitBranch() should just subscribe to the global stored cur branch.
}
