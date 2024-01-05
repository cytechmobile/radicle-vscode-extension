<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePatchDetailStore } from '@/stores/patchDetail'
import PatchStatusIcon from './PatchStatusIcon.vue'
import { computed } from 'vue'

const { patch } = storeToRefs(usePatchDetailStore())
const status = computed(() => patch.value.state.status)
</script>

<template>
  <span
    :class="[
      'rounded-full px-[0.75em] py-[0.25em] inline-flex items-center text-vscode-editor-background gap-[0.5em]',
      `bg-patch-${status}`
    ]"
  >
    <PatchStatusIcon :status="status" />
    <span class="capitalize">{{ status }}</span>
  </span>
</template>
