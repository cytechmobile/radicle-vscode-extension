import { createPinia, defineStore, setActivePinia } from 'pinia'
import { computed, effect, ref } from '@vue/reactivity'
import { rerenderAllItemsInPatchesView, rerenderSomeItemsInPatchesView } from '../ux'
import { fetchFromHttpd } from '../helpers'
import type { AugmentedPatch, Patch } from '../types'
import { useEnvStore, useGitStore } from '.'

setActivePinia(createPinia())

export const usePatchStore = defineStore('patch', () => {
  const patches = ref<AugmentedPatch[]>()
  effect(() => {
    patches.value
      ? rerenderSomeItemsInPatchesView(patches.value)
      : rerenderAllItemsInPatchesView()
  })
  effect(
    () => {
      useEnvStore().currentRepoId && resetAllPatches()
    },
    { lazy: true },
  )

  // TODO: maninak do similar and use latest commit to resolve the currently checkout out revision?
  const prevCheckedOutPatch = ref<AugmentedPatch>()
  const checkedOutPatch = computed<AugmentedPatch | undefined>((_prevCheckedOutPatch) => {
    prevCheckedOutPatch.value = _prevCheckedOutPatch

    const matchPatchIdFromUpstreamBranchRegex = /rad\/patches\/([0-9A-Fa-f]*)/
    const checkedOutPatchId = useGitStore().currentUpstreamBranch?.match(
      matchPatchIdFromUpstreamBranchRegex,
    )?.[1]

    const newCheckedOutPatch = checkedOutPatchId ? findPatchById(checkedOutPatchId) : undefined

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

  function findPatchById(partialOrWholeId: string) {
    const foundPatch = patches.value?.find((patch) => patch.id.includes(partialOrWholeId))

    return foundPatch
  }

  function findPatchByTitle(partialTitle: string) {
    const foundPatch = patches.value?.find((patch) => patch.title.includes(partialTitle))

    return foundPatch
  }

  async function refetchPatch(patchId: Patch['id']) {
    const rid = useEnvStore().currentRepoId
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

  const lastFetchedTs = ref<number>()
  let inProgressRequest: Promise<unknown> | undefined
  async function fetchAllPatches() {
    if (inProgressRequest) {
      try {
        await inProgressRequest

        return true
      } catch {
        return false
      }
    }

    const rid = useEnvStore().currentRepoId
    if (!rid) {
      return false
    }
    const nowTs = Date.now() / 1000 // we devide to align with the httpd's timestamp format
    lastFetchedTs.value = nowTs
    // TODO: refactor to make only a single request when https://radicle.zulipchat.com/#narrow/stream/369873-support/topic/fetch.20all.20patches.20in.20one.20req is resolved
    const promisedResponses = Promise.all([
      fetchFromHttpd(`/projects/${rid}/patches`, { query: { state: 'draft', perPage: 500 } }),
      fetchFromHttpd(`/projects/${rid}/patches`, { query: { state: 'open', perPage: 500 } }),
      fetchFromHttpd(`/projects/${rid}/patches`, {
        query: { state: 'archived', perPage: 500 },
      }),
      fetchFromHttpd(`/projects/${rid}/patches`, { query: { state: 'merged', perPage: 500 } }),
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
    findPatchByTitle,
    resetAllPatches,
    refetchPatch,
    initStoreIfNeeded,
  }
})
