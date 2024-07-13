import { ProgressLocation, commands, window } from 'vscode'
import { editPatch } from '../helpers'
import { usePatchStore } from '../stores'
import { showLog, truncateKeepWords } from '../utils'
import type { Patch } from '../types'
import { patchesViewId } from './patchesView'

// TODO: maninak when there are more mutations this should perhaps become more generic
// `runPatchMutation` that takes a callback for the mutation to execute and depending on the
// outcome notifies the user accordingly. Don't forget to update the JSDoc! :)
/**
 * Updates patch's title and description on Radicle and notifies the user of the outcome and,
 * when fitting, offers optional follow-up actions.
 */
export async function updatePatchTitleAndDescription(
  patchId: Patch['id'],
  newTitle: string,
  newDescr: string,
  timeoutSeconds?: number,
) {
  const updateOp = await window.withProgress(
    (timeoutSeconds ?? -1) < 30
      ? { location: { viewId: patchesViewId } }
      : {
          location: ProgressLocation.Window,
          title: `‎$(radicle-logo) Updating patch "${truncateKeepWords(newTitle, 60)}"…`,
        },
    // eslint-disable-next-line require-await, @typescript-eslint/require-await
    async () => editPatch(patchId, newTitle, newDescr, timeoutSeconds),
  )

  const buttonOutput = 'Show Output'

  if (updateOp.outcome === 'failure') {
    let didTimeOut = false
    if (updateOp.errorMsg.replaceAll(' ', '').toLowerCase().includes('timedout')) {
      didTimeOut = true
    }

    const buttonRetryHarder = 'Retry With Longer Timeout'
    const patchName = `"${truncateKeepWords(newTitle, 41)}"` // magic number to fit in one line
    const userSelection = await window.showErrorMessage(
      `Failed updating patch ${patchName}`,
      ...[didTimeOut ? buttonRetryHarder : undefined, buttonOutput].filter(Boolean),
    )

    if (userSelection === buttonOutput) {
      showLog()
    } else if (userSelection === buttonRetryHarder) {
      await updatePatchTitleAndDescription(
        patchId,
        newTitle,
        newDescr,
        (timeoutSeconds ?? 60) * 4,
      )
    }

    return
  }

  usePatchStore().refetchPatch(patchId)

  if (updateOp.didAnnounce) {
    const patchName = `"${truncateKeepWords(newTitle, 20)}"` // magic number to fit in one line
    window.showInformationMessage(`Updated and announced patch ${patchName} to the network`)
  } else {
    const patchName = `"${truncateKeepWords(newTitle, 60)}"`
    const buttonRetry = 'Retry Announce'
    const userSelection = await window.showWarningMessage(
      `Updated patch ${patchName} locally but failed announcing it to the network`,
      buttonRetry,
      buttonOutput,
    )
    if (userSelection === buttonOutput) {
      showLog()
    } else if (userSelection === buttonRetry) {
      commands.executeCommand('radicle.announce')
    }
  }
}
