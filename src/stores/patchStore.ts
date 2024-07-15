import { createPinia, defineStore, setActivePinia } from 'pinia'
import { computed, effect, ref, unref } from '@vue/reactivity'
import { rerenderAllItemsInPatchesView, rerenderSomeItemsInPatchesView } from '../ux'
import { fetchFromHttpd } from '../helpers'
import type { AugmentedPatch, Patch } from '../types'
import { retrieveAllPatches } from '../helpers/retrieveFromCli'
import { useEnvStore, useGitStore, useWebviewStore } from '.'

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

    const existingPatch = findPatchById(fetchedPatch.id)
    const augmentedFetchedPatch = { ...fetchedPatch, ...{ lastFetchedTs: nowTs } }
    if (existingPatch) {
      // we use `Object.assign()` to keep the same object ref
      Object.assign(existingPatch, augmentedFetchedPatch)
      // HACK: these below should be getting triggered reactively but they don't :/
      rerenderSomeItemsInPatchesView(existingPatch)
      useWebviewStore().find(`webview-patch-detail_${patchId}`)?.effectRunner()
    } else {
      if (!patches.value) {
        patches.value = []
      }
      patches.value.push(augmentedFetchedPatch)
    }

    return {}
  }

  const lastFetchedAllTs = ref<number>()
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
    lastFetchedAllTs.value = nowTs
    const promisedPatches = retrieveAllPatches(rid).finally(
      () => (inProgressRequest = undefined),
    )
    inProgressRequest = promisedPatches

    const retrievedPatches = (await promisedPatches).map((patch) => ({
      ...patch,
      ...{ lastFetchedTs: nowTs },
    }))

    patches.value = retrievedPatches

    return true
  }

  async function initStoreIfNeeded() {
    return !lastFetchedAllTs.value && (await fetchAllPatches())
  }

  function resetAllPatches() {
    patches.value = undefined
    lastFetchedAllTs.value = undefined
  }

  const lastFetchedTs = computed(() => {
    const ts = unref(
      patches.value?.length === 1 ? patches.value[0]?.lastFetchedTs : lastFetchedAllTs,
    )

    return ts
  })

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
