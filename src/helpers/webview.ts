import {
  type ExtensionContext,
  Uri,
  ViewColumn,
  type WebviewOptions,
  type WebviewPanel,
  window,
} from 'vscode'
import { getExtensionContext } from '../store'
import { getNonce, getUri } from '../utils'

export const patchDetailViewId = 'radicle-patch-detail-view'

let panel: WebviewPanel | undefined

// TODO: maninak document
export function createOrShowWebview(ctx: ExtensionContext, title = 'Patch DEADBEEF') {
  const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined

  // If we already have a panel, show it
  if (panel) {
    panel.reveal(column)

    return
  }

  // Otherwise, create a new panel

  const webviewOptions: WebviewOptions = {
    enableScripts: true,
    localResourceRoots: [
      Uri.joinPath(getExtensionContext().extensionUri, 'dist'),
      Uri.joinPath(getExtensionContext().extensionUri, 'assets'),
    ],
  }

  panel = window.createWebviewPanel(
    patchDetailViewId,
    title,
    column || ViewColumn.One,
    webviewOptions,
  )

  const webviewUri = getUri(panel.webview, getExtensionContext().extensionUri, [
    'dist',
    'webview.js',
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

        <vscode-button id="howdy">Howdy!</vscode-button>
        <script type="module" src="${webviewUri}" nonce="${nonce}"></script>
      </body>
      </html>
    `

  // Called whenever a webview's visibility changes, or is moved into a new column
  // TODO: maninak save current state (e.g. value of any <input> elems) and try to restore on next createOrShowWebview() see https://code.visualstudio.com/api/extension-guides/webview#getstate-and-setstate
  // panel.onDidChangeViewState()

  panel.onDidDispose(() => (panel = undefined), undefined, ctx.subscriptions)
}
