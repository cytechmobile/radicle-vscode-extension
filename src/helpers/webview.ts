import {
  type ExtensionContext,
  Uri,
  ViewColumn,
  type Webview,
  type WebviewOptions,
  type WebviewPanel,
  type WebviewPanelOptions,
  window,
} from 'vscode'
import { getExtensionContext } from '../store'
import { getNonce, truncateKeepWords } from '../utils'
import {
  type notifyExtension,
  notifyWebview as notifyWebviewBase,
} from '../utils/webview-messaging'
import type { Patch, PatchDetailInjectedState } from '../types'
import { copyToClipboardAndNotify } from '../ux'

export const webviewId = 'webview-patch-detail'

let panel: WebviewPanel | undefined

// TODO: maninak make the solution in file more generic, not only useful to a specific webview
// TODO: maninak move this file (and other found in helpers) to "/services" or "/providers"

/**
 * Opens a panel with the specified webview in the active column.
 *
 * If the webview is already open and visible in another column it will be moved to the active
 * column without getting re-created.
 *
 * @param [title] - The title shown on the webview panel's tab
 */
export function createOrShowWebview(ctx: ExtensionContext, patch: Patch) {
  const webviewState: PatchDetailInjectedState = {
    kind: 'patchDetail',
    id: patch.id,
    ts: Date.now(),
    state: patch,
  }

  const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined

  let isPanelDisposed
  try {
    // eslint-disable-next-line no-unused-expressions
    panel?.webview // getter will throw if panel is disposed
    isPanelDisposed = false
  } catch {
    isPanelDisposed = true
  }

  if (panel && !isPanelDisposed) {
    notifyWebview({ command: 'updateState', payload: webviewState })
    panel.title = getPanelTitle(patch)

    panel.reveal(column)

    return
  }

  const webviewOptions: WebviewPanelOptions & WebviewOptions = {
    enableScripts: true,
    localResourceRoots: [
      Uri.joinPath(getExtensionContext().extensionUri, 'dist'),
      Uri.joinPath(getExtensionContext().extensionUri, 'assets'),
      Uri.joinPath(getExtensionContext().extensionUri, 'src', 'webviews', 'dist'),
    ],
    enableFindWidget: true,
  }
  panel = window.createWebviewPanel(
    webviewId,
    getPanelTitle(patch),
    column || ViewColumn.One,
    webviewOptions,
  )

  panel.webview.html = getWebviewHtml(panel.webview, webviewState)

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
        case 'copyToClipboardAndNotify':
          copyToClipboardAndNotify(message.payload.textToCopy)
          break
      }
    },
    undefined,
    ctx.subscriptions,
  )
  panel.onDidDispose(() => (panel = undefined), undefined, ctx.subscriptions)
}

export function notifyWebview(message: Parameters<typeof notifyWebviewBase>['0']): void {
  panel && notifyWebviewBase(message, panel.webview)
}

// Restores the webview across restarts using persisted state.
// See https://code.visualstudio.com/api/extension-guides/webview#serialization
export function registerAllWebviewRestorators() {
  getExtensionContext().subscriptions.push(
    window.registerWebviewPanelSerializer(webviewId, {
      // eslint-disable-next-line @typescript-eslint/require-await, require-await
      deserializeWebviewPanel: async (_panel: WebviewPanel, _state: unknown) => {
        panel = _panel
        panel.webview.html = getWebviewHtml(panel.webview)
      },
    }),
  )
}

function getWebviewHtml<State extends object>(webview: Webview, state?: State) {
  const stylesUri = getUri(webview, getExtensionContext().extensionUri, [
    'src',
    'webviews',
    'dist',
    'assets',
    'index.css',
  ])
  const scriptUri = getUri(webview, getExtensionContext().extensionUri, [
    'src',
    'webviews',
    'dist',
    'assets',
    'index.js',
  ])
  const allowedSource = webview.cspSource
  const nonce = getNonce()

  const html = `
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
      <script nonce="${nonce}">
        window.injectedWebviewState = ${JSON.stringify(state)}
      </script>
    </head>
    <body>
      <div id="app"></div>
      <script type="module" src="${scriptUri}" nonce="${nonce}"></script>
    </body>
    </html>
  `

  return html
}

function getPanelTitle(patch: Patch) {
  const truncatedTitle = truncateKeepWords(patch.title, 30)

  return `${truncatedTitle}${truncatedTitle.length < patch.title.length ? ' …' : ''}`
}

function getUri(webview: Webview, extensionUri: Uri, pathList: string[]): Uri {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList))
}
