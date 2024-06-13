<script setup lang="ts">
import { toRaw } from 'vue'
import { storeToRefs } from 'pinia'
import { notifyExtension } from 'extensionUtils/webview-messaging'
import { usePatchDetailStore } from '@/stores/patchDetailStore'

const { patch } = storeToRefs(usePatchDetailStore())

function refetchPatchData() {
  notifyExtension({ command: 'refreshPatchData', payload: { patchId: patch.value.id } })
}

function checkOutPatchBranch() {
  notifyExtension({ command: 'checkOutPatchBranch', payload: { patch: toRaw(patch.value) } })
}

function checkOutDefaultBranch() {
  notifyExtension({ command: 'checkOutDefaultBranch', payload: undefined })
}

function revealPatch() {
  notifyExtension({ command: 'revealInPatchesView', payload: { patch: toRaw(patch.value) } })
}
</script>

<template>
  <vscode-button
    class="self-center"
    appearance="secondary"
    title="Refresh all data rendered on this page"
    @click="refetchPatchData"
  >
    <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
    <span slot="start" class="codicon codicon-refresh"></span>Refresh</vscode-button
  >
  <vscode-button
    v-if="!patch.isCheckedOut"
    class="self-center"
    appearance="secondary"
    title="Check out the Git branch associated with this Radicle patch"
    @click="checkOutPatchBranch"
  >
    <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
    <span slot="start" class="codicon codicon-check"></span>Check Out</vscode-button
  >
  <vscode-button
    v-else
    class="self-center"
    appearance="secondary"
    title="Switch from the Git branch associated with this patch to the repo's default branch"
    @click="checkOutDefaultBranch"
  >
    <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
    <span slot="start" class="codicon codicon-home"></span>Check Out Default</vscode-button
  >
  <vscode-button
    class="self-center"
    appearance="secondary"
    title="Reveal In Patches View"
    @click="revealPatch"
  >
    <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
    <span slot="start" class="codicon codicon-export"></span>Reveal</vscode-button
  >
</template>
