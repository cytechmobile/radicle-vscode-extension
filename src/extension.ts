import { type ExtensionContext, commands } from 'vscode'
import { initExtensionContext } from './store'
import {
  createOrShowWebview,
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

  // TODO: delete registration code from here and package.json when done with prototyping
  ctx.subscriptions.push(
    commands.registerCommand('wip-webview', () => {
      createOrShowWebview(ctx)
    }),
  )
}
