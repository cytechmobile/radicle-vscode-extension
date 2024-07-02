<script setup lang="ts">
import { toRaw } from 'vue'
import { storeToRefs } from 'pinia'
import { notifyExtension } from 'extensionUtils/webview-messaging'
import { usePatchDetailStore } from '@/stores/patchDetailStore'

const { patch, defaultBranch } = storeToRefs(usePatchDetailStore())

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
    title="Refresh All Data Rendered on This Page"
    @click="refetchPatchData"
  >
    <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
    <span slot="start" class="codicon codicon-refresh"></span>Refresh</vscode-button
  >
  <vscode-button
    v-if="!patch.isCheckedOut"
    class="self-center"
    appearance="secondary"
    title="Check Out the Git Branch Associated with This Radicle Patch"
    @click="checkOutPatchBranch"
  >
    <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
    <span slot="start" class="codicon codicon-check"></span>Check Out</vscode-button
  >
  <vscode-button
    v-else-if="defaultBranch"
    class="self-center"
    appearance="secondary"
    title="Switch from the Git Branch Associated with This Patch to the Repo's Default Branch"
    @click="checkOutDefaultBranch"
  >
    <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
    <span slot="start" class="codicon codicon-home"></span>Check&nbsp;Out&ThickSpace;<wbr />
    <pre>{{ defaultBranch }} </pre>
  </vscode-button>
  <vscode-button
    class="self-center"
    appearance="secondary"
    title="See All Files Changed in the Latest Revision"
    @click="revealPatch"
  >
    <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
    <span slot="start" class="codicon codicon-diff-single"></span>Browse Diff</vscode-button
  >
</template>
