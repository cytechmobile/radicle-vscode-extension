import { getExtensionContext } from '../store'
import { log } from '../utils'

/**
 * Append a new entry to the log with the extension activation event and version.
 */
export function logExtensionActivated(): void {
  const ctx = getExtensionContext()

  log(
    `Extension ${ctx.extension.packageJSON.displayName} v${ctx.extension.packageJSON.version} activated`,
    'info',
  )
}
