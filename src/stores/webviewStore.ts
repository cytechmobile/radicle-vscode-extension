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
  const store = reactive<
    Map<`${WebviewId}_${string}`, { panel: WebviewPanel; effectRunner: ReactiveEffectRunner }>
  >(new Map())

  function track(
    panel: WebviewPanel,
    webviewId: 'webview-patch-detail',
    data: Patch['id'],
  ): void
  function track(panel: WebviewPanel, webviewId: WebviewId, data: unknown): void {
    switch (webviewId) {
      case 'webview-patch-detail':
        {
          const patchId = data as Patch['id']

          const effectRunner = effect(async () => {
            const stateForWebview = await getStateForWebview(webviewId, patchId)
            alignUiWithWebviewPatchDetailState(panel, stateForWebview)
          })

          store.set(`${panel.viewType as WebviewId}_${patchId}`, { panel, effectRunner })
        }
        break
      default:
        assertUnreachable(webviewId)
    }
  }

  function untrack(entryId: `webview-patch-detail_${Patch['id']}`): boolean
  function untrack(entryId: `${WebviewId}_${string}`) {
    // TODO: maninak uncomment code below when we've fixed panels getting insta-disposed.
    // const effectRunner = panels.get(webviewId)?.effectRunner
    // effectRunner && stop(effectRunner) // `stop` is from @vue/reactivity

    return store.delete(entryId)
  }

  function find(
    entryId: `webview-patch-detail_${Patch['id']}`,
  ): { panel: WebviewPanel; effectRunner: ReactiveEffectRunner } | undefined
  function find(entryId: `${WebviewId}_${string}`) {
    return store.get(entryId)
  }

  return { track, untrack, find, isPanelDisposed }
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
