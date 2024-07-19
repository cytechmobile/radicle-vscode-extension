import { useEnvStore } from '../stores'
import { log } from '../utils'
import { execRad } from '.'

export type PatchMutatorResult =
  | { outcome: 'success'; didAnnounce: boolean }
  | { outcome: 'failure'; errorMsg: string }

/**
 * Performs mutation of the patch's title and description on Radicle. Effectively
 * it's editing the first patch revision.
 *
 * @returns An object with the outcome of the editing operation plus additional details
 * when available
 */
// export function mutatePatchTitleAndDescr(
//   patchId: Patch['id'],
//   newTitle: string,
//   newDescr: string,
//   timeoutSeconds?: number,
// ): PatchMutatorResult {
//   return execPatchMutation(
//     ['edit', patchId, '--message', newTitle, '--message', newDescr],
//     timeoutSeconds,
//   )
// }

// export function mutatePatchStatusToArchived(patch: Patch, timeoutSeconds?: number) {
//   return execPatchMutation(['archive', patch.id], timeoutSeconds)
// }

export function execPatchMutation(
  execRadArgs: NonNullable<Parameters<typeof execRad>['0']>,
  timeoutSeconds?: number,
): PatchMutatorResult {
  const rid = useEnvStore().currentRepoId
  if (!rid) {
    const errorMsg = 'Unable to resolve current repo id in `updatePatchTitleAndDescription()`'
    log(errorMsg, 'error')

    return { outcome: 'failure', errorMsg }
  }

  const [patchOp, patchId, ...miscRadArgs] = execRadArgs

  const execResult = execRad(
    ['patch', patchOp, patchId, '--repo', rid, ...miscRadArgs].filter(Boolean),
    {
      shouldLog: true,
      timeout: timeoutSeconds ? timeoutSeconds * 1000 : undefined,
    },
  )

  if (execResult.errorCode) {
    return {
      outcome: 'failure',
      errorMsg: `${execResult.stdout}\n${execResult.stderr}\n${execResult.errorCode}`,
    }
  } else if (execResult.stdout?.includes('Node is stopped')) {
    return { outcome: 'success', didAnnounce: false }
  } else {
    return { outcome: 'success', didAnnounce: true }
  }
}
