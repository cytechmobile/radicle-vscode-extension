<script setup lang="ts">
import { provideVSCodeDesignSystem, vsCodeButton } from '@vscode/webview-ui-toolkit'
import { storeToRefs } from 'pinia'
import { notifyExtension } from 'extensionUtils/webview-messaging'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import PatchStatusBadge from './PatchStatusBadge.vue'
import PatchMajorEvents from './PatchMajorEvents.vue'
import PatchMetadata from './PatchMetadata.vue'
import { toRaw } from 'vue'

provideVSCodeDesignSystem().register(vsCodeButton())

const { patch, firstRevision } = storeToRefs(usePatchDetailStore())

function refetchPatchData() {
  notifyExtension({ command: 'refreshPatchData', payload: { patchId: patch.value.id } })
  // TODO: maninak implement and consider using `<progress-ring>` while loading
}

function checkOutPatchBranch() {
  notifyExtension({ command: 'checkOutPatchBranch', payload: { patch: toRaw(patch.value) } })
}

function checkOutDefaultBranch() {
  notifyExtension({ command: 'checkOutDefaultBranch', payload: undefined })
}
</script>

<template>
  <article class="flex flex-col gap-8">
    <header class="pt-4 flex justify-between">
      <div class="flex gap-4 items-center">
        <PatchStatusBadge class="text-sm" />
        <PatchMajorEvents />
      </div>
      <aside class="ml-4 flex flex-col gap-2 *:w-full">
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
          title="Switch from the Git branch associated with this patch to the project's default branch"
          @click="checkOutDefaultBranch"
        >
          <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
          <span slot="start" class="codicon codicon-home"></span>Check Out
          Default</vscode-button
        >
      </aside>
    </header>
    <PatchMetadata />
    <main>
      <h1 class="mt-0 mb-5 text-3xl">{{ patch.title }}</h1>
      <pre>{{ firstRevision.description }}</pre>
    </main>
  </article>
</template>
