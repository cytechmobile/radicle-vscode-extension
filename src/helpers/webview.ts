import {
  type ExtensionContext,
  Uri,
  ViewColumn,
  type Webview,
  type WebviewOptions,
  type WebviewPanel,
  window,
} from 'vscode'
import { getExtensionContext } from '../store'
import { assertUnreachable, getNonce } from '../utils'
import {
  type notifyExtension,
  notifyWebview as notifyWebviewBase,
} from '../../lib/webview-messaging'

export const webviewId = 'webview-patch-detail'

let panel: WebviewPanel | undefined

export function notifyWebview(message: Parameters<typeof notifyWebviewBase>['0']): void {
  panel && notifyWebviewBase(message, panel.webview)
}

// TODO: maninak move this file (and other found in helpers) to "/services" or "/providers"

/**
 * Opens a panel with the specified webview in the active column.
 *
 * If the webview is already open and visible in another column it will be moved to the active
 * column without getting re-created.
 *
 * @param [title] - The title shown on the webview panel's tab
 */
export function createOrShowWebview(ctx: ExtensionContext, title = 'Patch DEADBEEF') {
  const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined

  if (panel) {
    panel.reveal(column)

    return
  }

  const webviewOptions: WebviewOptions = {
    enableScripts: true,
    localResourceRoots: [
      Uri.joinPath(getExtensionContext().extensionUri, 'dist'),
      Uri.joinPath(getExtensionContext().extensionUri, 'assets'),
      Uri.joinPath(getExtensionContext().extensionUri, 'src', 'webviews', 'dist'),
    ],
  }
  panel = window.createWebviewPanel(webviewId, title, column || ViewColumn.One, webviewOptions)

  const stylesUri = getUri(panel.webview, getExtensionContext().extensionUri, [
    'src',
    'webviews',
    'dist',
    'assets',
    'index.css',
  ])
  const scriptUri = getUri(panel.webview, getExtensionContext().extensionUri, [
    'src',
    'webviews',
    'dist',
    'assets',
    'index.js',
  ])
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
          style-src ${allowedSource} 'unsafe-inline';
          img-src ${allowedSource} https: data:;
          script-src 'strict-dynamic' 'nonce-${nonce}' 'unsafe-inline' https:;
          font-src ${allowedSource};
        "
      >
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" type="text/css" href="${stylesUri}" nonce="${nonce}">
      <title>${title}</title>
    </head>
    <body>
      <div id="app"></div>
      <script type="module" src="${scriptUri}" nonce="${nonce}"></script>
    </body>
    </html>
  `

  // Called whenever a webview's visibility changes, or is moved into a new column
  // TODO: maninak save current state (e.g. value of any <input> elems) and try to restore on next createOrShowWebview() see https://code.visualstudio.com/api/extension-guides/webview#getstate-and-setstate
  // panel.onDidChangeViewState()

  panel.webview.onDidReceiveMessage(
    (message: Parameters<typeof notifyExtension>['0']) => {
      switch (message.command) {
        case 'showInfoNotification': {
          const button = 'Reset Count'
          window.showInformationMessage(message.payload.text, button).then((userSelection) => {
            userSelection === button &&
              notifyWebview({ command: 'resetCount', payload: undefined })
          })
          break
        }

        default:
          assertUnreachable(message.command)
      }
    },
    undefined,
    ctx.subscriptions,
  )
  panel.onDidDispose(() => (panel = undefined), undefined, ctx.subscriptions)
}

function getUri(webview: Webview, extensionUri: Uri, pathList: string[]): Uri {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList))
}
