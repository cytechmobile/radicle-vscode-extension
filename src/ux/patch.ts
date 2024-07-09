import { commands, window } from 'vscode'
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
) {
  const patchName = `"${truncateKeepWords(newTitle, 20)}"`

  const updateOp = await window.withProgress(
    { location: { viewId: patchesViewId } },
    // eslint-disable-next-line require-await, @typescript-eslint/require-await
    async () => editPatch(patchId, newTitle, newDescr),
  )

  const buttonOutput = 'Show Output'

  // TODO: maninak if error contains `ETIMEDOUT` offer to retry with longer timeout
  if (updateOp.outcome === 'failure') {
    const patchName = `"${truncateKeepWords(newTitle, 41)}"`
    window
      .showErrorMessage(`Failed updating patch ${patchName}`, buttonOutput)
      .then((userSelection) => {
        userSelection === buttonOutput && showLog()
      })

    return
  }

  usePatchStore().refetchPatch(patchId)

  if (updateOp.didAnnounce) {
    window.showInformationMessage(`Updated and announced patch ${patchName} to the network`)
  } else {
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
