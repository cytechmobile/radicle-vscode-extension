import {
  type ExtensionContext,
  ViewColumn,
  type WebviewOptions,
  type WebviewPanel,
  commands,
  window,
} from 'vscode'
import { initExtensionContext } from './store'
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

const viewType = 'radicle-patch-detail-view'
const webviewOptions: WebviewOptions = { enableScripts: true }

let panel: WebviewPanel | undefined

function createOrShowWebview(ctx: ExtensionContext) {
  const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined

  // If we already have a panel, show it
  if (panel) {
    panel.reveal(column)

    return
  }

  // Otherwise, create a new panel
  panel = window.createWebviewPanel(
    viewType,
    'Patch DEADBEEF',
    column || ViewColumn.One,
    webviewOptions,
  )

  panel.webview.html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML TITLE TODO: make same as webview title</title>
  </head>
  <body>
    <h1 id="lines-of-code-counter">ohai!</h1>
    <script>
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
  </html>`

  // Called whenever a webview's visibility changes, or is moved into a new column
  // TODO: maninak save current state (e.g. value of any <input> elems) and try to restore on next createOrShowWebview()
  // panel.onDidChangeViewState()

  panel.onDidDispose(() => (panel = undefined), undefined, ctx.subscriptions)
}

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
