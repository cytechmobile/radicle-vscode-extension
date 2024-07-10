import { useEventListener } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, reactive, watchEffect } from 'vue'
import { type notifyWebview } from 'extensionUtils/webview-messaging'
import { getFirstAndLatestRevisions } from 'extensionHelpers/patch'
import type { Patch, PatchDetailWebviewInjectedState } from '../../../types'
import { getVscodeRef } from '@/utils/getVscodeRef'

type SavedPanelState = Omit<PatchDetailWebviewInjectedState, 'id'> & typeof initialExtraState

const vscode = getVscodeRef<SavedPanelState>()
const initialExtraState = {
  injectedStateIds: [] as number[],
  patchEditForm: { title: '', descr: '', isEditing: false },
}

export const usePatchDetailStore = defineStore('patch-detail', () => {
  const savedVscodeState = vscode.getState()
  const shouldRejectInjectedState = savedVscodeState?.injectedStateIds.includes(
    window.injectedWebviewState.id,
  )
  const state = reactive({
    ...initialExtraState,
    ...savedVscodeState,
    ...(shouldRejectInjectedState
      ? undefined
      : { ...window.injectedWebviewState, id: undefined }),
  } as SavedPanelState)
  state.injectedStateIds.push(window.injectedWebviewState.id)

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
  const delegates = computed(() => state.state.delegates)
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
    delegates,
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
