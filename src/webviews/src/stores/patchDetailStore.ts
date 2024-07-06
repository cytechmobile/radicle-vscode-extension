import { useEventListener } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, reactive, watchEffect } from 'vue'
import { type notifyWebview } from 'extensionUtils/webview-messaging'
import { getFirstAndLatestRevisions } from 'extensionUtils/patch'
import type { Patch, PatchDetailWebviewInjectedState } from '../../../types'
import { getVscodeRef } from '@/utils/getVscodeRef'

const vscode = getVscodeRef<PatchDetailWebviewInjectedState>()
const initialExtraState = { patchEditForm: { title: '', descr: '', isEditing: false } }

export const usePatchDetailStore = defineStore('patch-detail', () => {
  const state = reactive({
    ...initialExtraState,
    ...vscode.getState(),
    ...window.injectedWebviewState,
  })
  /*
   * Let's invalidate the injected state we just used since it's stale beyond now.
   * Theoretically it should always get overwritten anyway but best to be safe.
   * It's going to be preserved with setState anyway.
   */
  window.injectedWebviewState = undefined as unknown as PatchDetailWebviewInjectedState

  const patch = computed(() => state.state.patch)

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
        [] as Patch['author'][],
      ),
  )

  const localIdentity = computed(() => state.state.localIdentity)
  const identities = computed(() => {
    const mergers = patch.value.merges.map((merge) => merge.author)
    const commenters = patch.value.revisions.flatMap((revision) =>
      revision.discussions.map((discussion) => discussion.author),
    )
    const reviewers = patch.value.revisions.flatMap((revision) =>
      revision.reviews.map((review) => review.author),
    )

    const uniqueIds = [
      ...new Map(
        [localIdentity.value, ...authors.value, ...mergers, ...commenters, ...reviewers]
          .filter(Boolean)
          .map((identity) => [identity.id, identity]),
      ).values(),
    ]

    return uniqueIds
  })

  const timeLocale = computed(() => state.state.timeLocale)
  const defaultBranch = computed(() => state.state.defaultBranch)

  const patchEditForm = computed(() => state.patchEditForm)

  watchEffect(() => {
    // TODO: save and restore scroll position?
    vscode.setState(state)
  })

  useEventListener(
    window,
    'message',
    (event: MessageEvent<Parameters<typeof notifyWebview>['0']>) => {
      const message = event.data

      if (message.command === 'updateState') {
        const stateBak = { ...state }
        Object.assign(state, initialExtraState, stateBak, message.payload)
      }
    },
  )

  return {
    patch,
    firstRevision,
    latestRevision,
    authors,
    localIdentity,
    identities,
    timeLocale,
    defaultBranch,
    patchEditForm,
  }
})

declare global {
  interface Window {
    injectedWebviewState: PatchDetailWebviewInjectedState
  }
}
