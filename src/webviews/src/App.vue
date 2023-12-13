<script setup lang="ts">
import Counter from './components/Counter.vue';
import { useEventListener } from '@vueuse/core'
import { useCounterStore } from '@/stores/counter';
import type { MessageToWebview } from 'lib/webview-messaging'

 // TODO: maninak add linter and hook-up scripts
 // TODO: maninak add component auto-import
 // TODO: maninak add auto-import vue-use


useEventListener(window, 'message', (event: MessageEvent<MessageToWebview>) => {
  const message = event.data

  switch (message.command) {
    case 'resetCount':
      useCounterStore().reset()
      break
  }
})
</script>

<template>
  <Counter/>
</template>
