import type { WebviewPanel } from 'vscode'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { type ReactiveEffectRunner, effect, reactive } from '@vue/reactivity'
import { assertUnreachable } from '../utils'
import type { Patch } from '../types'
import { alignUiWithWebviewPatchDetailState, getStateForWebview } from '../helpers'

setActivePinia(createPinia())

// TODO: maninak check why webviews are not reused
// TODO: maninak on shift/alt + click on item button to open webview, open always in newtab

export const allWebviewIds = ['webview-patch-detail'] as const
/**
 * A collection of all our custom panel types under a (hopefully) a better name.
 * @see WebviewPanel.viewType
 */
export type WebviewId = (typeof allWebviewIds)[number]

export const useWebviewStore = defineStore('webviewStore', () => {
  const panels = reactive<
    Map<WebviewId, { panel: WebviewPanel; effectRunner: ReactiveEffectRunner }>
  >(new Map())

  function trackPanel(
    panel: WebviewPanel,
    webviewId: 'webview-patch-detail',
    data: Patch['id'],
  ): void
  function trackPanel(panel: WebviewPanel, webviewId: WebviewId, data: unknown): void {
    switch (webviewId) {
      case 'webview-patch-detail':
        {
          const effectRunner = effect(async () => {
            const stateForWebview = await getStateForWebview(webviewId, data as Patch['id'])
            alignUiWithWebviewPatchDetailState(panel, stateForWebview)
          })

          panels.set(panel.viewType as WebviewId, { panel, effectRunner })
        }
        break
      default:
        assertUnreachable(webviewId)
    }
  }

  function untrackPanel(panel: WebviewPanel) {
    const webviewId = panel.viewType as WebviewId

    // TODO: maninak uncomment code below when we've fixed panels getting insta-disposed. Also shouldn't we keep multiple panel/effect entries per webviewId? I think we currently keep only the latest tracked panel.
    // const effectRunner = panels.get(webviewId)?.effectRunner
    // effectRunner && stop(effectRunner) // `stop` is from @vue/reactivity

    return panels.delete(webviewId)
  }

  function findPanel(id: WebviewId) {
    return panels.get(id)?.panel
  }

  return { trackPanel, untrackPanel, findPanel, isPanelDisposed }
})

function isPanelDisposed(panel: WebviewPanel) {
  try {
    // eslint-disable-next-line no-unused-expressions
    panel.webview // getter will throw if panel is disposed

    return false
  } catch {
    return true
  }
}
