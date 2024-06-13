import vscode from 'vscode'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { computed } from '@vue/reactivity'
import { convertLocaleFromLibcToBcp47 } from '../utils'
import { getCurrentProjectId } from '../helpers'

setActivePinia(createPinia())

export const useEnvStore = defineStore('envStore', () => {
  const timeLocaleBcp47 = computed<Parameters<Date['toLocaleDateString']>['0']>(() => {
    return (
      convertLocaleFromLibcToBcp47(process.env['LC_ALL']) ||
      convertLocaleFromLibcToBcp47(process.env['LC_TIME']) ||
      convertLocaleFromLibcToBcp47(process.env['LANG']) ||
      vscode.env.language
    )
  })

  const currentProjectId = computed(getCurrentProjectId)

  function refreshCurrentProjectId() {
    currentProjectId.effect.dirty = true
  }

  return { timeLocaleBcp47, currentProjectId, refreshCurrentProjectId }
})
