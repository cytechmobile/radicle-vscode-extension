import {
  type ExtensionContext,
  Uri,
  ViewColumn,
  type WebviewOptions,
  type WebviewPanel,
  window,
} from 'vscode'
import { getExtensionContext } from '../store'
import { assertUnreachable, getNonce, getUri } from '../utils'
import {
  type MessageToExtension,
  type MessageToWebview,
  postMessageToWebview,
} from '../../lib/webview-messaging'

export const webviewId = 'webview-patch-detail'

let panel: WebviewPanel | undefined

// TODO: maninak move this (and other files from helpers to "/services" or "/providers")

// TODO: maninak document
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
      Uri.joinPath(getExtensionContext().extensionUri, 'src', 'webviews', 'dist', 'assets'),
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
          Cross-Origin-Opener-Policy: same-origin;
          Cross-Origin-Embedder-Policy: require-corp;
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
    (message: MessageToExtension) => {
      switch (message.command) {
        case 'showInfoNotification': {
          const button = 'Reset Count'
          window.showInformationMessage(message.text, button).then((userSelection) => {
            userSelection === button && postMsgToWebview({ command: 'resetCount' })
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

export function postMsgToWebview(message: MessageToWebview): void {
  panel && postMessageToWebview(message, panel.webview)
}
