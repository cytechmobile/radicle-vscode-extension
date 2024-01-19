import { getExtensionContext } from '../stores'
import { log } from '../utils'

interface PackageJson {
  displayName?: string
  version?: string
}

/**
 * Append a new entry to the log with the extension activation event and version.
 */
export function logExtensionActivated(): void {
  const packageJson = getExtensionContext().extension.packageJSON as PackageJson
  const name = packageJson.displayName
  const version = packageJson.version

  const msg =
    name && version ? `Extension ${name} v${version} activated` : `Extension activated`

  log(msg, 'info')
}
