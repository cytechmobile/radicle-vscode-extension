import type { ExtensionContext } from 'vscode'
import {
  logExtensionActivated,
  registerAllCommands,
  registerAllConfigWatchers,
  registerAllFileWatchers,
  validateRadCliAuthentication,
  validateRadCliInstallation,
} from './utils'
import { initExtensionContext } from './store'

export async function activate(ctx: ExtensionContext) {
  initExtensionContext(ctx)

  registerAllCommands()
  registerAllConfigWatchers()
  registerAllFileWatchers()

  logExtensionActivated()
  await validateRadCliInstallation({ minimizeUserNotifications: true })
  validateRadCliAuthentication({ minimizeUserNotifications: true })
}
