import { type ExtensionContext, commands } from 'vscode'
import { initExtensionContext } from './store'
import {
  createOrShowWebview,
  logExtensionActivated,
  registerAllCommands,
  registerAllConfigWatchers,
  registerAllFileWatchers,
  registerAllViews,
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

  // Persist state across restarts. See https://code.visualstudio.com/api/extension-guides/webview#serialization
  // ctx.subscriptions.push(
  //   window.registerWebviewPanelSerializer(webviewId, {
  //     deserializeWebviewPanel: async (panel: WebviewPanel, state: unknown) => {
  //       currentPanel = panel
  //       // `state` is the state persisted using `setState` inside the webview
  //       console.log(`Got state: ${state}`)
  //       // panel.webview.html = getWebviewHtml(state)
  //     },
  //   }),
  // )
}
