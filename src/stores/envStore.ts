import vscode from 'vscode'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { computed } from '@vue/reactivity'
import { memoizedGetCurrentProjectId } from '../helpers'
import { convertLocaleFromLibcToBcp47 } from '../utils'

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

  const currentProjectId = computed(() => memoizedGetCurrentProjectId())

  return { timeLocaleBcp47, currentProjectId }
})
