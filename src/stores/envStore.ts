import vscode, { type ExtensionContext } from 'vscode'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { type ShallowRef, computed, ref, shallowRef } from '@vue/reactivity'
import type { DId } from '../types'
import { convertLocaleFromLibcToBcp47, log } from '../utils'
import {
  execRad,
  getAbsolutePathToDefaultRadBinaryLocation,
  getConfig,
  getCurrentRepoId,
  getLocalRadicleIdentity,
  getValidatedPathToRadBinaryWhenAliased,
} from '../helpers'

setActivePinia(createPinia())

export const useEnvStore = defineStore('envStore', () => {
  /**
   * The extension's context available in the `activate()` function
   */
  const extCtx = shallowRef() as ShallowRef<ExtensionContext>

  /**
   * Sets the global store with the extension's context.
   *
   * Should be called only once, at the very top of the `activate()` function.
   *
   * @param {ExtensionContext} ctx The extension's context available in
   * the `activate()` function.
   */
  function setExtensionContext(ctx: ExtensionContext): void {
    extCtx.value = ctx
  }

  const timeLocaleBcp47 = computed<Parameters<Date['toLocaleDateString']>['0']>(() => {
    return (
      convertLocaleFromLibcToBcp47(process.env['LC_ALL']) ||
      convertLocaleFromLibcToBcp47(process.env['LC_TIME']) ||
      convertLocaleFromLibcToBcp47(process.env['LANG']) ||
      vscode.env.language
    )
  })

  const radPathRecomputeSignal = ref(0)
  /**
   * The most preferable absolute path to the Radicle CLI binary resolved among user configured
   * option, default path etc. It may or may not actually point to an existing working binary.
   */
  const resolvedAbsolutePathToRadBinary = computed(() => {
    void radPathRecomputeSignal.value
    const radCliPath =
      getConfig('radicle.advanced.pathToRadBinary') ??
      getValidatedPathToRadBinaryWhenAliased() ??
      getAbsolutePathToDefaultRadBinaryLocation()

    return radCliPath
  })

  function refreshResolvedAbsolutePathToRadBinary() {
    radPathRecomputeSignal.value++
  }

  const localIdentityRecomputeSignal = ref(0)
  const localIdentity = computed(() => {
    void localIdentityRecomputeSignal.value

    return getLocalRadicleIdentity('DID')
  })

  function refreshLocalIdentity() {
    localIdentityRecomputeSignal.value++
  }

  const currentRepoIdRecomputeSignal = ref(0)
  const currentRepoId = computed(() => {
    void currentRepoIdRecomputeSignal.value

    return getCurrentRepoId()
  })

  function refreshCurrentRepoId() {
    currentRepoIdRecomputeSignal.value++
  }

  const currentRepoInfo = computed(() => {
    void currentRepoId.value
    void localIdentity.value // `rad inspect --identity` currently fails if no local node id

    const { stdout: repoIdStringified } = execRad(['inspect', '--identity'], {
      cwd: '$workspaceDir',
    })
    if (!repoIdStringified) {
      return undefined
    }

    try {
      const repoIdentity = JSON.parse(repoIdStringified) as {
        payload: {
          'xyz.radicle.project': {
            defaultBranch: string
            description: string
            name: string
          }
        }
        delegates: DId[]
        threshold: number
      }

      const repoIdNormalized = {
        ...repoIdentity.payload['xyz.radicle.project'],
        delegates: repoIdentity.delegates,
        threshold: repoIdentity.threshold,
      }

      return repoIdNormalized
    } catch {
      log("Failed sourcing current Radicle repository's information", 'error')

      return undefined
    }
  })

  return {
    extCtx,
    setExtensionContext,
    timeLocaleBcp47,
    localIdentity,
    refreshLocalIdentity,
    currentRepoId,
    refreshCurrentRepoId,
    currentRepoInfo,
    resolvedAbsolutePathToRadBinary,
    refreshResolvedAbsolutePathToRadBinary,
  }
})
