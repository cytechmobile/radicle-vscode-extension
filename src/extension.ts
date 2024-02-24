import type { ExtensionContext } from 'vscode'
import { initExtensionContext } from './stores'
import {
  logExtensionActivated,
  registerAllCommands,
  registerAllConfigWatchers,
  registerAllFileWatchers,
  registerAllViews,
  registerAllWebviewRestorators,
} from './helpers'
import {
  validateHttpdConnection,
  validateRadCliInstallation,
  validateRadicleIdentityAuthentication,
} from './ux'
import { setWhenClauseContext } from './utils'

export function activate(ctx: ExtensionContext) {
  initExtensionContext(ctx)

  registerAllCommands()
  registerAllViews()
  registerAllConfigWatchers()
  registerAllFileWatchers()
  registerAllWebviewRestorators()

  logExtensionActivated()
  validateRadCliInstallation({ minimizeUserNotifications: true })
  validateRadicleIdentityAuthentication({ minimizeUserNotifications: true })
  validateHttpdConnection({ minimizeUserNotifications: true })

  setWhenClauseContext('radicle.isExtensionActivated', true)
}
