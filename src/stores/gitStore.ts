import { createPinia, defineStore, setActivePinia } from 'pinia'
import { computed, ref } from '@vue/reactivity'
import { fetchFromHttpd } from '../helpers'
import { getCurrentGitBranch, getCurrentGitUpstreamBranch, log } from '../utils'
import { notifyUserAboutFetchError } from '../ux'
import { useEnvStore } from './'

setActivePinia(createPinia())

/*
 *TODO: maninak see if I can use native git plugin's getters instead of my own utils
 * and if they are faster (mine are slow ~20-40ms for each util call)
 *
 * Resources:
 * - https://github.com/walles/git-commit-message-plus/blob/83bebe0321e99f616a08d9a043f2cdd790d5e26b/src/extension.ts#L82-L118
 * - https://github.com/microsoft/vscode/blob/08d383346c18f6b20cb74219611f7c1b590c35b1/extensions/git/README.md#git-integration-for-visual-studio-code
 * - https://github.com/microsoft/vscode/blob/main/extensions/git/src/api/api1.ts#L160
 * - https://github.com/microsoft/vscode-pull-request-github/blob/0068c135d1c3e5ce601c1d5c7f7007904e59901e/src/extension.ts#L53
 * - https://github.com/Microsoft/vscode/blob/main/extensions/git/src/api/git.d.ts
 * - https://code.visualstudio.com/api/references/vscode-api#extensions
 * - https://stackoverflow.com/a/60238771/5015955
 */

export const useGitStore = defineStore('gitStore', () => {
  const currentBranchRecomputeSignal = ref(0)
  const currentBranch = computed(() => {
    void currentBranchRecomputeSignal.value

    return getCurrentGitBranch()
  })
  const currentUpstreamBranch = computed(() => {
    void currentBranchRecomputeSignal.value

    return getCurrentGitUpstreamBranch()
  })

  function refreshCurentBranch() {
    currentBranchRecomputeSignal.value++
  }

  const defaultBranch = ref<string>()

  async function getDefaultBranch() {
    if (defaultBranch.value) {
      return defaultBranch.value
    }

    const rid = useEnvStore().currentRepoId
    if (!rid) {
      log('Failed resolving RID of current repo while trying to `getDefaultBranch()`', 'error')

      return undefined
    }

    const { data: repo, error } = await fetchFromHttpd(`/projects/${rid}`)
    if (error) {
      notifyUserAboutFetchError(error)

      return undefined
    }

    defaultBranch.value = repo.defaultBranch

    return repo.defaultBranch
  }

  return {
    currentBranch,
    currentUpstreamBranch,
    refreshCurentBranch,
    getDefaultBranch,
  }
})
