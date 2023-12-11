import {
  type ExtensionContext,
  Uri,
  ViewColumn,
  type WebviewOptions,
  type WebviewPanel,
  commands,
  window,
} from 'vscode'
import { getExtensionContext, initExtensionContext } from './store'
import {
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

  ctx.subscriptions.push(
    commands.registerCommand('radicle.test-webview', () => {
      createOrShowWebview(ctx)
    }),
  )

  const viewType = 'radicle-patch-detail-view'
  const webviewOptions: WebviewOptions = {
    enableScripts: true,
    localResourceRoots: [Uri.joinPath(getExtensionContext().extensionUri, 'assets')],
  }

  let panel: WebviewPanel | undefined

  function createOrShowWebview(ctx: ExtensionContext, title = 'Patch DEADBEEF') {
    const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined

    // If we already have a panel, show it
    if (panel) {
      panel.reveal(column)

      return
    }

    // Otherwise, create a new panel
    panel = window.createWebviewPanel(
      viewType,
      title,
      column || ViewColumn.One,
      webviewOptions,
    )

    const allowedSource = panel.webview.cspSource
    const nonce = getNonce()
    panel.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta
          http-equiv="Content-Security-Policy"
          content="
            default-src 'none';
            object-src 'none';
            base-uri 'none';
            style-src ${allowedSource};
            img-src ${allowedSource};
            script-src 'strict-dynamic' 'nonce-${nonce}' 'unsafe-inline' http: https:;
            require-trusted-types-for 'script';
          "
        >
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body>
        <h1 id="lines-of-code-counter">ohai!</h1>
        <script nonce="${nonce}">
          function addElement() {
            // create a new div element
            const newDiv = document.createElement("div");

            // and give it some content
            const newContent = document.createTextNode(Date.now());

            // add the text node to the newly created div
            newDiv.appendChild(newContent);

            // add the newly created element and its content into the DOM
            document.body.appendChild(newDiv);
          }

          addElement()
        </script>

        <input></input>
      </body>
      </html>
    `

    // Called whenever a webview's visibility changes, or is moved into a new column
    // TODO: maninak save current state (e.g. value of any <input> elems) and try to restore on next createOrShowWebview()
    // panel.onDidChangeViewState()

    panel.onDidDispose(() => (panel = undefined), undefined, ctx.subscriptions)
  }

  function getNonce() {
    let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }

    return text
  }

  // if (window.registerWebviewPanelSerializer) {
  //   // TODO: maninak  add memory of serializer to disposables
  //   // Make sure we register a serializer in activation event
  //   window.registerWebviewPanelSerializer(viewType, {
  //     async deserializeWebviewPanel(webviewPanel: WebviewPanel, state: any) {
  //       console.log(`Got state: ${state}`)
  //       // Reset the webview options so we use latest uri for `localResourceRoots`.
  //       webviewPanel.webview.options = webviewOptions
  //       revive(webviewPanel, ctx.extensionUri)
  //     },
  //   })
  // }
}
