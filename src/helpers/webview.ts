import { Uri, ViewColumn, type Webview, window } from 'vscode'
import {
  type PatchDetailWebviewId,
  getExtensionContext,
  useEnvStore,
  usePatchStore,
  useWebviewStore,
} from '../stores'
import { assertUnreachable, getNonce, truncateKeepWords } from '../utils'
import { type notifyExtension, notifyWebview } from '../utils/webview-messaging'
import type { AugmentedPatch, PatchDetailWebviewInjectedState } from '../types'
import { checkOutDefaultBranch, checkOutPatch, copyToClipboardAndNotify } from '../ux'
import { getRadicleIdentity, revealPatch } from '.'

// TODO: move this file (and other found in helpers) to "/services" or "/providers"

/**
 * Opens a panel with the specified webview in the active column.
 *
 * If the webview is already open and visible in another column it will be moved to the active
 * column without getting re-created.
 */
export function createOrReuseWebviewPanel({
  webviewId,
  data,
  panelTitle,
}: /* unite here alternative `webviewId` & `data` pairs as new webviews get built */ {
  /**
   * The identifier specifying the kind of the panel to be (re-)used.
   */
  webviewId: PatchDetailWebviewId
  /**
   * The data to be used for the UI rendered on the webview.
   */
  data: AugmentedPatch
  /**
   * The title to be used for the webview panel's tab.
   */
  panelTitle: string
}) {
  const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined

  const webviewStore = useWebviewStore()
  const foundPanel = webviewStore.findPanel(webviewId)

  let stateForWebview
  switch (webviewId) {
    case 'webview-patch-detail':
      stateForWebview = getStateForWebviewPatchDetail(data)
      break
    default:
      assertUnreachable(webviewId)
  }

  if (foundPanel && !webviewStore.isPanelDisposed(foundPanel)) {
    notifyWebview({ command: 'updateState', payload: stateForWebview }, foundPanel.webview)
    foundPanel.title = panelTitle
    foundPanel.reveal(column)

    return
  }

  createAndShowWebviewPanel(webviewId, panelTitle, column, stateForWebview)
}

/**
 * Restores the webview across restarts using persisted state.
 *
 * @see https://code.visualstudio.com/api/extension-guides/webview#serialization
 */
export function registerAllWebviewRestorators() {
  getExtensionContext().subscriptions.push(
    window.registerWebviewPanelSerializer('webview-patch-detail', {
      // eslint-disable-next-line require-await
      deserializeWebviewPanel: async (
        panel,
        state: ReturnType<typeof getStateForWebviewPatchDetail>,
        // eslint-disable-next-line @typescript-eslint/require-await
      ) => {
        // TODO: maninak init webview with listeners and all
        useWebviewStore().trackPanel(panel)
        panel.webview.html = getWebviewHtml(panel.webview, state)
      },
    }),
  )
}

function getStateForWebviewPatchDetail(
  patch: AugmentedPatch,
): PatchDetailWebviewInjectedState {
  const isCheckedOut = patch.id === usePatchStore().checkedOutPatch?.id

  const identity = getRadicleIdentity('DID')
  const localIdentity = identity ? { id: identity.DID, alias: identity.alias } : undefined

  const state: PatchDetailWebviewInjectedState = {
    kind: 'webview-patch-detail',
    id: patch.id,
    state: {
      patch: { ...patch, isCheckedOut },
      localIdentity,
      timeLocale: useEnvStore().timeLocaleBcp47,
    },
  }

  return state
}

function createAndShowWebviewPanel(
  webviewId: Parameters<typeof createOrReuseWebviewPanel>['0']['webviewId'],
  panelTitle: string,
  column?: Parameters<typeof window.createWebviewPanel>['2'],
  state?: object,
) {
  const webviewStore = useWebviewStore()
  const panel = window.createWebviewPanel(
    webviewId,
    getTruncatedTitle(panelTitle),
    column ?? ViewColumn.One,
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
  webviewStore.trackPanel(panel)

  panel.onDidDispose(
    () => webviewStore.untrackPanel(panel),
    undefined,
    getExtensionContext().subscriptions,
  )

  let handleMessageFromWebview: Parameters<Webview['onDidReceiveMessage']>['0']
  switch (webviewId) {
    case 'webview-patch-detail':
      handleMessageFromWebview = async (
        message: Parameters<typeof handleMessageFromWebviewPatchDetail>[0],
      ) => {
        await handleMessageFromWebviewPatchDetail(message, panel.webview)
      }
      break
    default:
      assertUnreachable(webviewId)
  }
  panel.webview.onDidReceiveMessage(
    handleMessageFromWebview,
    undefined,
    getExtensionContext().subscriptions,
  )

  panel.webview.html = getWebviewHtml(panel.webview, state)
}

function getTruncatedTitle(title: string) {
  const truncatedTitle = truncateKeepWords(title, 30)

  return `${truncatedTitle}${truncatedTitle.length < title.length ? ' …' : ''}`
}

async function handleMessageFromWebviewPatchDetail(
  message: Parameters<typeof notifyExtension>['0'],
  webview: Webview,
) {
  switch (message.command) {
    case 'showInfoNotification': {
      const button = 'Reset Count'
      window.showInformationMessage(message.payload.text, button).then((userSelection) => {
        userSelection === button &&
          notifyWebview({ command: 'resetCount', payload: undefined }, webview)
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

function getUri(webview: Webview, extensionUri: Uri, pathList: string[]): Uri {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList))
}
