import { useEventListener } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watchEffect } from 'vue'
import { type notifyWebview } from 'extensionUtils/webview-messaging'
import { getFirstAndLatestRevisions } from 'extensionUtils/patch'
import type { Patch, PatchDetailWebviewInjectedState } from '../../../types'
import { getVscodeRef } from '@/utils/getVscodeRef'

const vscode = getVscodeRef<PatchDetailWebviewInjectedState>()
const initialExtraState = { patchEditForm: { title: '', descr: '', isEditing: false } }

export const usePatchDetailStore = defineStore('patch-detail', () => {
  const state = ref({
    ...initialExtraState,
    ...vscode.getState(),
    ...window.injectedWebviewState,
  })

  const patch = computed(() => state.value.state.patch)

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

  const localIdentity = computed(() => state.value.state.localIdentity)
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

  const timeLocale = computed(() => state.value.state.timeLocale)

  watchEffect(() => {
    // TODO: save and restore scroll position?
    vscode.setState(state.value)
  })

  useEventListener(
    window,
    'message',
    (event: MessageEvent<Parameters<typeof notifyWebview>['0']>) => {
      const message = event.data

      if (message.command === 'updateState') {
        state.value = { ...initialExtraState, ...state, ...message.payload }
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
    patchEditForm: state.value.patchEditForm,
  }
})

declare global {
  interface Window {
    injectedWebviewState: PatchDetailWebviewInjectedState
  }
}
