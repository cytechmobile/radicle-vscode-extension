<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import PatchStatusIcon from './PatchStatusIcon.vue'
import { computed } from 'vue'

const { patch } = storeToRefs(usePatchDetailStore())
const status = computed(() => patch.value.state.status)
</script>

<template>
  <span
    class="rounded-full px-[0.75em] py-[0.25em] inline-flex items-center text-vscode-editor-background gap-[0.5em]"
    :style="`background: color-mix(in srgb-linear, var(--vscode-patch-${status}), var(--vscode-editor-foreground) 5%);`"
  >
    <PatchStatusIcon :status="status" />
    <span class="-mb-[0.125em] capitalize font-mono">{{ status }}</span>
  </span>
</template>
