<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import PatchStatusIcon from './PatchStatusIcon.vue'
import { computed } from 'vue'

const { patch, delegates, firstRevision, localIdentity } = storeToRefs(usePatchDetailStore())
const status = computed(() => patch.value.state.status)

const isAuthedToEditStatus = computed(() => {
  return [
    ...delegates.value.map((delegate) => delegate.id),
    firstRevision.value.author.id,
  ].includes(localIdentity.value?.id)
})
</script>

<template>
  <span
    class="relative rounded-full px-[0.75em] py-[0.25em] inline-flex items-center text-vscode-editor-background gap-[0.5em] group"
    :style="`background: color-mix(in srgb-linear, var(--vscode-patch-${status}), var(--vscode-editor-foreground) 5%);`"
  >
    <span class="-mb-[0.125em] group-hover:invisible group-focus-within:invisible"
      ><PatchStatusIcon :status="status"
    /></span>
    <span
      class="-mb-[0.125em] capitalize font-mono group-hover:invisible group-focus-within:invisible"
      >{{ status }}</span
    >

    <vscode-button
      v-if="isAuthedToEditStatus"
      appearance="icon"
      title="Change Patch Status"
      class="absolute left-0 w-full h-full opacity-0 focus:opacity-100 text-vscode-editor-background group-hover:opacity-100"
      @click="toggleStatusEditing"
    >
      <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
      <span class="codicon codicon-edit" slot="start"></span>
      Edit
    </vscode-button>
  </span>
</template>

<style scoped>
vscode-button[appearance='icon']:hover,
vscode-button[appearance='icon']:focus-visible {
  background-color: transparent;
  @apply backdrop-brightness-110;
}

vscode-button::part(control):focus-visible {
  @apply outline outline-offset-2 outline-[var(--focus-border)] rounded-full;
}
</style>
