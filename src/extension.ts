import type { ExtensionContext } from 'vscode'
import { initExtensionContext } from './store'
import {
  logExtensionActivated,
  registerAllCommands,
  registerAllConfigWatchers,
  registerAllFileWatchers,
} from './helpers'
import { validateRadCliInstallation, validateRadicleIdentityAuthentication } from './ux'

export function activate(ctx: ExtensionContext) {
  initExtensionContext(ctx)

  registerAllCommands()
  registerAllConfigWatchers()
  registerAllFileWatchers()

  logExtensionActivated()
  validateRadCliInstallation({ minimizeUserNotifications: true })
  validateRadicleIdentityAuthentication({ minimizeUserNotifications: true })
}
