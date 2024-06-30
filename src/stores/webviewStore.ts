import type { WebviewPanel } from 'vscode'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { computed, reactive } from '@vue/reactivity'

setActivePinia(createPinia())

// TODO: maninak check why webviews are not reused
// TODO: maninak on shift/alt + click on item button to open webview, open always in newtab

export const allWebviewIds = ['webview-patch-detail'] as const
export type PatchDetailWebviewId = (typeof allWebviewIds)[0]
/**
 * A collection of all our custom panel types under a (hopefully) a better name.
 * @see WebviewPanel.viewType
 */
export type WebviewId = (typeof allWebviewIds)[number]

export const useWebviewStore = defineStore('webviewStore', () => {
  const panels = reactive<Map<WebviewId, WebviewPanel>>(new Map())

  const patchDetailPanel = computed(() => panels.get('webview-patch-detail'))

  function trackPanel(panel: WebviewPanel) {
    // TODO: maninak create a `const stateForWebview = computed(...)` and store it along with this panel?
    // Then call `effect(...)` that notifiesWebview to update its state whenever that computed is updated?
    // Maybe move `getStateForWebview()` from webview.ts in here and rename it `getComputedStateForPatchDetailWebview()`?
    return panels.set(panel.viewType as WebviewId, panel)
  }

  function untrackPanel(panel: WebviewPanel) {
    return panels.delete(panel.viewType as WebviewId)
  }

  function findPanel(id: WebviewId) {
    return panels.get(id)
  }

  return { patchDetailPanel, trackPanel, untrackPanel, findPanel, isPanelDisposed }
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
