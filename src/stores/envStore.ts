import vscode, { type ExtensionContext } from 'vscode'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { type ShallowRef, computed, ref, shallowRef } from '@vue/reactivity'
import { convertLocaleFromLibcToBcp47 } from '../utils'
import {
  getAbsolutePathToDefaultRadBinaryLocation,
  getConfig,
  getCurrentRepoId,
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

  const currentRepoIdRecomputeSignal = ref(0)
  const currentRepoId = computed(() => {
    void currentRepoIdRecomputeSignal.value

    return getCurrentRepoId()
  })

  function refreshCurrentRepoId() {
    currentRepoIdRecomputeSignal.value++
  }

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

  return {
    extCtx,
    setExtensionContext,
    timeLocaleBcp47,
    currentRepoId,
    refreshCurrentRepoId,
    resolvedAbsolutePathToRadBinary,
    refreshResolvedAbsolutePathToRadBinary,
  }
})
