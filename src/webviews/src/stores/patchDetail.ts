import { useEventListener } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watchEffect } from 'vue'
import type { notifyWebview } from 'extensionUtils/webview-messaging'
import { getFirstAndLatestRevisions } from 'extensionUtils/patch'
import type { Patch, PatchDetailInjectedState } from '../../../types'
import { getVscodeRef } from '@/utils/getVscodeRef'

const vscode = getVscodeRef<PatchDetailInjectedState>()

export const usePatchDetailStore = defineStore('counter', () => {
  const state = ref(vscode.getState() ?? window.injectedWebviewState)

  const patch = computed(() => state.value.state)

  const firstAndLatestRevisions = computed(() => getFirstAndLatestRevisions(patch.value))
  const firstRevision = computed(() => firstAndLatestRevisions.value.firstRevision)
  const latestRevision = computed(() => firstAndLatestRevisions.value.latestRevision)

  const authors = computed(() =>
    patch.value.revisions
      .map((rev) => rev.author)
      .reduce(
        (uniqueAuthors, maybeUniqueAuthor) =>
          uniqueAuthors.find((uniqueAuthor) => uniqueAuthor.id === maybeUniqueAuthor.id)
            ? uniqueAuthors
            : [...uniqueAuthors, maybeUniqueAuthor],
        [] as Patch['author'][]
      )
  )

  watchEffect(() => {
    vscode.setState(state.value)
  })

  useEventListener(
    window,
    'message',
    (event: MessageEvent<Parameters<typeof notifyWebview>['0']>) => {
      const message = event.data

      if (message.command === 'updateState') {
        state.value = message.payload
      }
    }
  )

  return { patch, firstRevision, latestRevision, authors }
})

declare global {
  interface Window {
    injectedWebviewState: PatchDetailInjectedState
  }
}
