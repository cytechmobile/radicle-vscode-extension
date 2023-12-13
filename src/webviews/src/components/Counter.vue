<script setup lang="ts">
 // TODO: maninak fix codicon not showing
import { useCounterStore } from '@/stores/counter'
import { storeToRefs } from 'pinia'
import { provideVSCodeDesignSystem, vsCodeButton } from '@vscode/webview-ui-toolkit'
import { postMessageToWebviewHost } from 'lib/vscode'

provideVSCodeDesignSystem().register(vsCodeButton())

const counterStore = useCounterStore()
const { count, doubleCount } = storeToRefs(counterStore)
const { increment } = counterStore

function showInfoNotifWithCount() {
  postMessageToWebviewHost({
    command: "showInfoNotification",
    text: `The count is: ${count.value}`,
  })
}
</script>

<template>
  <h1>Vue.js counter</h1>
  <div class="count-output"><h3>Count:</h3><pre>{{ count }}</pre></div>
  <div class="count-output"><h3>Count doubled:</h3><pre>{{ doubleCount }}</pre></div>
  <div class="button-group">
    <vscode-button @click="increment">Increment</vscode-button>
    <vscode-button appearance="secondary" @click="()=> count = 0">Reset</vscode-button>
    <vscode-button appearance="icon" @click="showInfoNotifWithCount">
      <span class="codicon codicon-megaphone"></span>
    </vscode-button>
  </div>
</template>

<style scoped>
.count-output {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
}

.button-group {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
}
</style>
