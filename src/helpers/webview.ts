import { type ExtensionContext, Uri, ViewColumn, type Webview, window } from 'vscode'
import {
  getExtensionContext,
  useEnvStore,
  usePatchStore,
  useWebviewStore,
  webviewPatchDetailId,
} from '../stores'
import { assertUnreachable, getNonce, truncateKeepWords } from '../utils'
import { type notifyExtension, notifyWebview } from '../utils/webview-messaging'
import type { AugmentedPatch, PatchDetailInjectedState } from '../types'
import { checkOutDefaultBranch, checkOutPatch, copyToClipboardAndNotify } from '../ux'
import { getRadicleIdentity, revealPatch } from '.'

// TODO: make the solution in file more generic, not only useful to a specific webview
// TODO: move this file (and other found in helpers) to "/services" or "/providers"

/**
 * Opens a panel with the specified webview in the active column.
 *
 * If the webview is already open and visible in another column it will be moved to the active
 * column without getting re-created.
 *
 * @param [title] - The title shown on the webview panel's tab
 */
export function createOrShowWebview(
  ctx: ExtensionContext,
  webviewId: string,
  patch: AugmentedPatch,
) {
  const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined

  const webviewStore = useWebviewStore()
  const foundPanel = webviewStore.findPanel(webviewId)

  // If panel already exists and is usable then re-use it

  if (foundPanel && !webviewStore.isPanelDisposed(foundPanel)) {
    notifyWebview(
      { command: 'updateState', payload: getStateForWebviewPatchDetail(patch) },
      foundPanel.webview,
    )
    foundPanel.title = getPanelTitle(patch)
    foundPanel.reveal(column)

    return
  }

  // Otherwise create new panel from scratch

  const newPanel = window.createWebviewPanel(
    webviewId,
    getPanelTitle(patch),
    column || ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [
        Uri.joinPath(getExtensionContext().extensionUri, 'dist'),
        Uri.joinPath(getExtensionContext().extensionUri, 'assets'),
        Uri.joinPath(getExtensionContext().extensionUri, 'src', 'webviews', 'dist'),
      ],
      enableFindWidget: true,
    },
  )
  webviewStore.trackPanel(newPanel)

  newPanel.onDidDispose(
    () => webviewStore.untrackPanel(newPanel),
    undefined,
    ctx.subscriptions,
  )

  newPanel.webview.onDidReceiveMessage(
    async (message: Parameters<typeof notifyExtension>['0']) => {
      switch (message.command) {
        case 'showInfoNotification': {
          const button = 'Reset Count'
          window.showInformationMessage(message.payload.text, button).then((userSelection) => {
            userSelection === button &&
              notifyWebview({ command: 'resetCount', payload: undefined }, newPanel.webview)
          })
          break
        }
        case 'copyToClipboardAndNotify':
          copyToClipboardAndNotify(message.payload.textToCopy)
          break
        case 'refreshPatchData':
          usePatchStore().refetchPatch(message.payload.patchId)
          break
        case 'checkOutPatchBranch':
          checkOutPatch(message.payload.patch)
          break
        case 'checkOutDefaultBranch':
          await checkOutDefaultBranch()
          break
        case 'revealInPatchesView':
          revealPatch(message.payload.patch)
          break
        default:
          assertUnreachable(message)
      }
    },
    undefined,
    ctx.subscriptions,
  )

  newPanel.webview.html = getWebviewHtml(
    newPanel.webview,
    getStateForWebviewPatchDetail(patch),
  )
}

/**
 * Restores the webview across restarts using persisted state.
 *
 * @see https://code.visualstudio.com/api/extension-guides/webview#serialization
 */
export function registerAllWebviewRestorators() {
  getExtensionContext().subscriptions.push(
    window.registerWebviewPanelSerializer(webviewPatchDetailId, {
      // eslint-disable-next-line require-await
      deserializeWebviewPanel: async (
        panel,
        state: ReturnType<typeof getStateForWebviewPatchDetail>,
        // eslint-disable-next-line @typescript-eslint/require-await
      ) => {
        // TODO: maninak init webview with listeners and all
        panel.webview.html = getWebviewHtml(panel.webview, state)
        useWebviewStore().trackPanel(panel)
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

function getStateForWebviewPatchDetail(patch: AugmentedPatch): PatchDetailInjectedState {
  const isCheckedOut = patch.id === usePatchStore().checkedOutPatch?.id

  const identity = getRadicleIdentity('DID')
  const localIdentity = identity ? { id: identity.DID, alias: identity.alias } : undefined

  const state: PatchDetailInjectedState = {
    kind: webviewPatchDetailId,
    id: patch.id,
    state: {
      patch: { ...patch, isCheckedOut },
      localIdentity,
      timeLocale: useEnvStore().timeLocaleBcp47,
    },
  }

  return state
}

function getPanelTitle(patch: AugmentedPatch) {
  const truncatedTitle = truncateKeepWords(patch.title, 30)

  return `${truncatedTitle}${truncatedTitle.length < patch.title.length ? ' …' : ''}`
}

function getUri(webview: Webview, extensionUri: Uri, pathList: string[]): Uri {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList))
}
