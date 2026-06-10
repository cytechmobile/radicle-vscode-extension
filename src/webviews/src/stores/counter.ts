import { useEventListener } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watchEffect } from 'vue'
import type { notifyWebview } from 'extensionUtils/webview-messaging'
import { getVscodeRef } from '@/utils/getVscodeRef'

const initialState = { count: 0 }
const vscode = getVscodeRef<typeof initialState>()

export const useCounterStore = defineStore('counter', () => {
  const state = ref(vscode.getState() ?? initialState)

  const count = computed(() => state.value.count)
  const doubleCount = computed(() => state.value.count * 2)

  function increment() {
    state.value.count++
  }

  function reset() {
    state.value.count = 0
  }

  watchEffect(() => {
    vscode.setState(state.value)
  })

  useEventListener(
    window,
    'message',
    (event: MessageEvent<Parameters<typeof notifyWebview>['0']>) => {
      const message = event.data

      message.command === 'resetCount' && reset()
    },
  )

  return { count, doubleCount, increment, reset }
})
