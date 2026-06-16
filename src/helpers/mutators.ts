import { execRad } from '.'
import { useEnvStore } from '../stores'
import { log } from '../utils'

export type PatchMutatorResult =
  | { outcome: 'success'; didAnnounce: boolean }
  | { outcome: 'failure'; errorMsg: string }

/**
 * Executes a `rad patch` mutation command and wraps the outcome in a structured result object.
 *
 * @param execRadArgs - Arguments passed directly to `execRad`, starting with the patch
 * sub-command (e.g. `['edit', patchId, '--message', title]`).
 * @param timeoutSeconds - Optional timeout in seconds. Defaults to `execRad`'s own default.
 * @returns A result object indicating `'success'` with an announce flag, or `'failure'` with
 * an error message.
 */
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
