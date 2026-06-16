import type { ExtensionContext } from 'vscode'
import {
  logExtensionActivated,
  registerAllCommands,
  registerAllConfigWatchers,
  registerAllFileWatchers,
  registerAllViews,
  registerAllWebviewRestorators,
  registerExtensionHostAutoReload,
} from './helpers'
import { useEnvStore } from './stores'
import { setWhenClauseContext } from './utils'
import {
  validateHttpdConnection,
  validateRadCliInstallation,
  validateRadicleIdentityAuthentication,
} from './ux'

export function activate(ctx: ExtensionContext) {
  useEnvStore().setExtensionContext(ctx)

  registerAllCommands()
  registerAllViews()
  registerAllConfigWatchers()
  registerAllFileWatchers()
  registerAllWebviewRestorators()
  registerExtensionHostAutoReload()

  logExtensionActivated()
  validateRadCliInstallation({ minimizeUserNotifications: true })
  validateRadicleIdentityAuthentication({ minimizeUserNotifications: true })
  validateHttpdConnection({ minimizeUserNotifications: true })

  setWhenClauseContext('radicle.isExtensionActivated', true)
}
