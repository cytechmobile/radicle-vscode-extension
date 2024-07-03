import { Uri, ViewColumn, type Webview, type WebviewPanel, commands, window } from 'vscode'
import {
  type PatchDetailWebviewId,
  type WebviewId,
  allWebviewIds,
  useEnvStore,
  useGitStore,
  usePatchStore,
  useWebviewStore,
} from '../stores'
import { assertUnreachable, getNonce, shortenHash, showLog, truncateKeepWords } from '../utils'
import { type notifyExtension, notifyWebview } from '../utils/webview-messaging'
import type { Patch, PatchDetailWebviewInjectedState } from '../types'
import { checkOutDefaultBranch, checkOutPatch, copyToClipboardAndNotify } from '../ux'
import { getRadicleIdentity, revealPatch, updatePatchTitleAndDescription } from '.'

// TODO: move this file (and other found in helpers) to "/services" or "/providers"

/**
 * Opens a panel with the specified webview in the active column.
 *
 * If the webview is already open and visible in another column it will be moved to the active
 * column without getting re-created.
 */
export async function createOrReuseWebviewPanel({
  webviewId,
  data,
  proposedPanelTitle,
}: /* unite here alternative `webviewId` & `data` pairs as new webviews get built */ {
  /**
   * The identifier specifying the kind of the panel to be (re-)used.
   */
  webviewId: PatchDetailWebviewId
  /**
   * The data to be used for the UI rendered on the webview.
   */
  data: Patch['id']
  /**
   * The proposed title to be used for the webview panel's tab. May be further processed.
   */
  proposedPanelTitle: string
}) {
  const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined
  const webviewStore = useWebviewStore()
  const foundPanel = webviewStore.findPanel(webviewId)
  const stateForWebview = await getStateForWebview(webviewId, data)

  if (foundPanel && !webviewStore.isPanelDisposed(foundPanel)) {
    notifyWebview({ command: 'updateState', payload: stateForWebview }, foundPanel.webview)
    foundPanel.title = getFormatedPanelTitle(proposedPanelTitle)
    foundPanel.reveal(column)

    return
  }

  createAndShowWebviewPanel(webviewId, proposedPanelTitle, stateForWebview, column)
}

/**
 * Restores the webview across restarts using the persisted state, if available.
 *
 * @see https://code.visualstudio.com/api/extension-guides/webview#serialization
 */
export function registerAllWebviewRestorators() {
  for (const webviewId of allWebviewIds) {
    switch (webviewId) {
      case 'webview-patch-detail':
        useEnvStore().extCtx.subscriptions.push(
          window.registerWebviewPanelSerializer(webviewId, {
            deserializeWebviewPanel: async (
              panel,
              state?: Awaited<ReturnType<typeof getStateForWebview>>,
            ) => {
              if (state) {
                initializePanel(panel, webviewId, state)
              } else {
                const patchesStore = usePatchStore()
                await patchesStore.initStoreIfNeeded()
                const foundPatch = patchesStore.findPatchByTitle(
                  panel.title.replace(/…?$/, ''),
                )

                if (!foundPatch) {
                  panel.dispose()

                  return
                }

                const recreatedState = await getStateForWebview(webviewId, foundPatch.id)
                initializePanel(panel, webviewId, recreatedState)
              }
            },
          }),
        )
        break
      default:
        assertUnreachable(webviewId)
    }
  }
}

export async function getStateForWebview(
  webviewId: PatchDetailWebviewId,
  patchId: Patch['id'],
): Promise<PatchDetailWebviewInjectedState> // eslint-disable-next-line padding-line-between-statements, consistent-return
export async function getStateForWebview(
  webviewId: WebviewId,
  data: unknown,
): Promise<unknown> {
  switch (webviewId) {
    case 'webview-patch-detail': {
      const patchStore = usePatchStore()
      const patchId = data as Patch['id']
      let patch = patchStore.findPatchById(patchId)
      if (!patch) {
        await patchStore.refetchPatch(patchId)
        patch = patchStore.findPatchById(patchId)
      }
      if (!patch) {
        throw new Error(`Failed resolving patch when getting state for webview "${webviewId}"`)
      }

      const isCheckedOut = patch.id === patchStore.checkedOutPatch?.id

      const identity = getRadicleIdentity('DID')
      const localIdentity = identity ? { id: identity.DID, alias: identity.alias } : undefined

      const state: PatchDetailWebviewInjectedState = {
        kind: webviewId,
        id: patch.id,
        state: {
          patch: { ...patch, isCheckedOut },
          timeLocale: useEnvStore().timeLocaleBcp47,
          localIdentity,
          defaultBranch: await useGitStore().getDefaultBranch(),
        },
      }

      return state
    }
    default:
      assertUnreachable(webviewId)
  }
}

function createAndShowWebviewPanel(
  webviewId: Parameters<typeof createOrReuseWebviewPanel>['0']['webviewId'],
  panelTitle: string,
  stateForWebview: Awaited<ReturnType<typeof getStateForWebview>>,
  column?: Parameters<typeof window.createWebviewPanel>['2'],
) {
  const panel = window.createWebviewPanel(
    webviewId,
    getFormatedPanelTitle(panelTitle),
    column ?? ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [
        Uri.joinPath(useEnvStore().extCtx.extensionUri, 'dist'),
        Uri.joinPath(useEnvStore().extCtx.extensionUri, 'assets'),
        Uri.joinPath(useEnvStore().extCtx.extensionUri, 'src', 'webviews', 'dist'),
      ],
      enableFindWidget: true,
    },
  )

  initializePanel(panel, webviewId, stateForWebview)
}

export function getFormatedPanelTitle(title: string) {
  const truncatedTitle = truncateKeepWords(title, 30)

  return truncatedTitle
}

function initializePanel(
  panel: WebviewPanel,
  webviewId: Parameters<typeof createOrReuseWebviewPanel>['0']['webviewId'],
  stateForWebview: Awaited<ReturnType<typeof getStateForWebview>>,
) {
  const webviewStore = useWebviewStore()
  webviewStore.trackPanel(panel, webviewId, stateForWebview.state.patch.id)

  panel.onDidDispose(
    () => webviewStore.untrackPanel(panel),
    undefined,
    useEnvStore().extCtx.subscriptions,
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
    useEnvStore().extCtx.subscriptions,
  )

  panel.webview.html = getWebviewHtml(panel.webview, stateForWebview)
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
      revealPatch(message.payload.patch, { expand: true, focus: true })
      break
    case 'updatePatchTitleAndDescription':
      // TODO: maninak move to UX
      // TODO: maninak show loading notification while the cmd is running
      {
        const patchId = message.payload.patchId

        const updateOp = updatePatchTitleAndDescription({ ...message.payload, patchId })
        usePatchStore().refetchPatch(patchId)

        const buttonOutput = 'Show Output'
        // TODO: maninak if error contains `ETIMEDOUT` offer to retry with longer timeout
        if (updateOp.outcome === 'failure') {
          window
            .showErrorMessage(`Failed updating patch "${shortenHash(patchId)}"`, buttonOutput)
            .then((userSelection) => {
              userSelection === buttonOutput && showLog()
            })

          return
        }

        const patchName = `"${truncateKeepWords(message.payload.newTitle, 20)}"`
        if (updateOp.didAnnounce) {
          window.showInformationMessage(
            `Updated and announced patch ${patchName} to the network`,
          )
        } else {
          const buttonRetry = 'Retry Announce'
          const userSelection = await window.showWarningMessage(
            `Updated patch ${patchName} locally but failed announcing it to the network`,
            buttonRetry,
            buttonOutput,
          )
          if (userSelection === buttonOutput) {
            showLog()
          } else if (userSelection === buttonRetry) {
            commands.executeCommand('radicle.announce')
          }
        }
      }
      break
    default:
      assertUnreachable(message)
  }
}

function getWebviewHtml<State extends object>(webview: Webview, state?: State) {
  const stylesUri = getUri(webview, ['src', 'webviews', 'dist', 'assets', 'index.css'])
  const scriptUri = getUri(webview, ['src', 'webviews', 'dist', 'assets', 'index.js'])
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

function getUri(webview: Webview, pathList: string[]): Uri {
  return webview.asWebviewUri(Uri.joinPath(useEnvStore().extCtx.extensionUri, ...pathList))
}
