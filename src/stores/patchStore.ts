import { createPinia, defineStore, setActivePinia } from 'pinia'
import { computed, effect, ref } from '@vue/reactivity'
import { rerenderAllItemsInPatchesView, rerenderSomeItemsInPatchesView } from '../ux'
import { fetchFromHttpd, memoizedGetCurrentProjectId } from '../helpers'
import type { AugmentedPatch, Patch } from '../types'
import { useGitStore } from '.'

setActivePinia(createPinia())

export const usePatchStore = defineStore('patch', () => {
  const patches = ref<AugmentedPatch[]>()

  effect(() => {
    // TODO: diff prev-vs-new and re-render only those patches that got updated?
    patches.value
      ? rerenderSomeItemsInPatchesView(patches.value)
      : rerenderAllItemsInPatchesView()
  })

  const prevCheckedOutPatch = ref<AugmentedPatch>()
  const checkedOutPatch = computed<AugmentedPatch | undefined>((_prevCheckedOutPatch) => {
    prevCheckedOutPatch.value = _prevCheckedOutPatch
    const matchHexCharsAfterPatchRegex = /patch\/([0-9A-Fa-f]*)/
    const checkedOutPatchPartialId = useGitStore().currentBranch?.match(
      matchHexCharsAfterPatchRegex,
    )?.[1]

    const newCheckedOutPatch = checkedOutPatchPartialId
      ? findPatchById(checkedOutPatchPartialId)
      : undefined

    return newCheckedOutPatch
  })
  effect(() => {
    rerenderSomeItemsInPatchesView(
      [prevCheckedOutPatch.value, checkedOutPatch.value].filter(Boolean),
    )
  })

  function resetAllPatches() {
    patches.value = undefined
  }

  async function refetchPatch(patchId: Patch['id']) {
    const rid = memoizedGetCurrentProjectId() // TODO: maninak get from a store instead
    if (!rid) {
      return { error: new Error('Failed resolving RID') }
    }

    const nowTs = Date.now() / 1000 // we devide to align with the httpd's timestamp format
    const { data: fetchedPatch, error } = await fetchFromHttpd(
      `/projects/${rid}/patches/${patchId}`,
    )
    if (error) {
      return { error }
    }

    const outdatedPatch = findPatchById(fetchedPatch.id)
    const augmentedFetchedPatch = { ...fetchedPatch, ...{ lastFetchedTs: nowTs } }
    if (outdatedPatch) {
      // we use `Object.assign()` to keep the same object ref
      Object.assign(outdatedPatch, augmentedFetchedPatch)
    } else {
      if (!patches.value) {
        patches.value = []
      }
      patches.value.push(augmentedFetchedPatch)
    }

    return {}
  }

  function findPatchById(partialOrWholeId: string) {
    const foundPatch = patches.value?.find((patch) => patch.id.includes(partialOrWholeId))

    return foundPatch
  }

  const lastFetchedTs = ref<number>()
  let inProgressRequest: Promise<unknown> | undefined
  async function fetchAllPatches() {
    if (inProgressRequest) {
      await inProgressRequest

      return true
    }

    const rid = memoizedGetCurrentProjectId() // TODO: maninak get from a store instead
    if (!rid) {
      return false
    }
    const nowTs = Date.now() / 1000 // we devide to align with the httpd's timestamp format
    lastFetchedTs.value = nowTs
    // TODO: refactor to make only a single request when https://radicle.zulipchat.com/#narrow/stream/369873-support/topic/fetch.20all.20patches.20in.20one.20req is resolved
    const promisedResponses = Promise.all([
      fetchFromHttpd(`/projects/${rid}/patches`, 'GET', undefined, {
        query: { state: 'draft' },
      }),
      fetchFromHttpd(`/projects/${rid}/patches`, 'GET', undefined, {
        query: { state: 'open' },
      }),
      fetchFromHttpd(`/projects/${rid}/patches`, 'GET', undefined, {
        query: { state: 'archived' },
      }),
      fetchFromHttpd(`/projects/${rid}/patches`, 'GET', undefined, {
        query: { state: 'merged' },
      }),
    ]).finally(() => (inProgressRequest = undefined))
    inProgressRequest = promisedResponses

    const responses = await promisedResponses
    const errors = responses.map((response) => response.error).filter(Boolean)
    if (errors.length) {
      return false
    }

    const fetchedPatches = responses
      .flatMap((response) => response.data)
      .filter(Boolean)
      .map((fetchedPatch) => ({ ...fetchedPatch, ...{ lastFetchedTs: nowTs } }))

    patches.value = fetchedPatches

    return true
  }

  async function initStoreIfNeeded() {
    return !patches.value && (await fetchAllPatches())
  }

  return {
    patches,
    checkedOutPatch,
    lastFetchedTs,
    findPatchById,
    resetAllPatches,
    refetchPatch,
    initStoreIfNeeded,
  }
})
