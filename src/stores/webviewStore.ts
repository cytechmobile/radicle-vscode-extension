import type { WebviewPanel } from 'vscode'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { computed, reactive } from '@vue/reactivity'
import { webviewId } from '../helpers'

setActivePinia(createPinia())

// TODO: maninak check why webviews are not reused
// TODO: maninak on shift/alt + click on item button to open webview, open always in newtab

export const useWebviewStore = defineStore('webviewStore', () => {
  const panels = reactive<Map<string, WebviewPanel>>(new Map())

  const patchDetailPanel = computed(() => panels.get(webviewId))

  function trackPanel(panel: WebviewPanel) {
    // TODO: maninak create a `const stateForWebview = computed(...)` and store it along with this panel?
    // Then call `effect(...)` that notifiesWebview to update its state whenever that computed is updated?
    // Maybe move `getStateForWebview()` from webview.ts in here and rename it `getComputedStateForPatchDetailWebview()`?
    return panels.set(panel.viewType, panel)
  }

  function untrackPanel(panel: WebviewPanel) {
    return panels.delete(panel.viewType)
  }

  function findPanel(id: string) {
    return panels.get(id)
  }

  function isPanelDisposed(panel: WebviewPanel) {
    try {
      // eslint-disable-next-line no-unused-expressions
      panel?.webview // getter will throw if panel is disposed

      return false
    } catch {
      return true
    }
  }

  return { patchDetailPanel, trackPanel, untrackPanel, findPanel, isPanelDisposed }
})
