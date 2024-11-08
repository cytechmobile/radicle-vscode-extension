import { useEventListener } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, reactive, watchEffect } from 'vue'
import { type notifyWebview } from 'extensionUtils/webview-messaging'
import { getFirstAndLatestRevisions } from 'extensionHelpers/patch'
import type { Patch, PatchDetailWebviewInjectedState, Revision } from '../../../types'
import { getVscodeRef } from '@/utils/getVscodeRef'

type SavedPanelState = Omit<PatchDetailWebviewInjectedState, 'id'> & typeof initialExtraState
type FormStatus = 'off' | 'editing' | 'previewing'

const vscode = getVscodeRef<SavedPanelState>()
const initialExtraState = {
  injectedStateIds: [] as number[],
  patchEditForm: { title: '', descr: '', status: 'off' as FormStatus },
  patchCommentForm: {} as Record<Revision['id'], { comment: string; status: FormStatus }>,
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

  const firstAndLatestRevisions = computed(() => getFirstAndLatestRevisions(patch.value))
  const firstRevision = computed(() => firstAndLatestRevisions.value.firstRevision)
  const latestRevision = computed(() => firstAndLatestRevisions.value.latestRevision)
  const mergedRevision = computed(() =>
    patch.value.revisions.find((revision) => revision.id === patch.value.merges[0]?.revision),
  )

  // TODO: delete `identities` from `patchDetailStore` or move it into patchStore across all patches if not too slow. Will be useful for a "Contributors" view.
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
        [state.state.localIdentity, ...authors.value, ...mergers, ...commenters, ...reviewers]
          .filter(Boolean)
          .map((identity) => [identity.id, identity]),
      ).values(),
    ]

    return uniqueIds
  })

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
    authors,
    firstRevision,
    latestRevision,
    mergedRevision,
    identities,
    localIdentity: computed(() => state.state.localIdentity),
    timeLocale: computed(() => state.state.timeLocale),
    delegates: computed(() => state.state.delegates),
    defaultBranch: computed(() => state.state.defaultBranch),
    patchEditForm: computed(() => state.patchEditForm),
    patchCommentForm: computed(() => state.patchCommentForm),
  }
})

declare global {
  interface Window {
    injectedWebviewState: PatchDetailWebviewInjectedState
  }
}
