import { getExtensionContext } from '../stores'
import { log } from '../utils'

/**
 * Append a new entry to the log with the extension activation event and version.
 */
export function logExtensionActivated(): void {
  interface PackageJson {
    displayName?: string
    version?: string
  }
  const packageJson = getExtensionContext().extension.packageJSON as PackageJson
  const name = packageJson.displayName
  const version = packageJson.version

  const msg =
    name && version ? `Extension ${name} v${version} activated` : `Extension activated`

  log(msg, 'info')
}
