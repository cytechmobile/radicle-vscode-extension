<script setup lang="ts">
import {
  provideVSCodeDesignSystem,
  vsCodeDivider,
  vsCodeTag
} from '@vscode/webview-ui-toolkit'
import { storeToRefs } from 'pinia'
import { usePatchDetailStore } from '@/stores/patchDetail'
import PatchStatusIcon from '@/components/PatchStatusIcon.vue'

provideVSCodeDesignSystem().register(vsCodeTag(), vsCodeDivider())

const patchDetailStore = usePatchDetailStore()
const { patch, firstRevision } = storeToRefs(patchDetailStore)
</script>

<template>
  <div style="display: flex; align-items: center; gap: 0.25rem">
    <pre
      style="
        text-transform: capitalize;
        background-color: var(--vscode-textPreformat-background);
        color: var(--vscode-textPreformat-foreground);
      "
      >{{ patch.state.status }}</pre
    >
    —
    <pre>{{ patch.id }}</pre>
  </div>
  <!-- <vscode-divider /> -->
  <h1 style="display: flex; align-items: center; gap: 0.5em">
    <PatchStatusIcon :status="patch.state.status" />
    {{ patch.title }}
  </h1>
  <div>{{ firstRevision.description }}</div>
</template>

<style scoped>
.codicon codicon-git-pull-request {
  color: var(--vscode-patch-open);
}
</style>
