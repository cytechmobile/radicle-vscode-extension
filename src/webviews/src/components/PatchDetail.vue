<script setup lang="ts">
import { provideVSCodeDesignSystem, vsCodeButton } from '@vscode/webview-ui-toolkit'
import { storeToRefs } from 'pinia'
import { usePatchDetailStore } from '@/stores/patchDetail'
import PatchStatusBadge from './PatchStatusBadge.vue'
import PatchMajorEvents from './PatchMajorEvents.vue'
import PatchMetadata from './PatchMetadata.vue'

provideVSCodeDesignSystem().register(vsCodeButton())

const { patch, firstRevision } = storeToRefs(usePatchDetailStore())

function refetchPatchData() {
  // TODO: maninak implement use `<progress-ring>` while loading
}
</script>

<template>
  <article class="flex flex-col gap-8">
    <header class="pt-4 flex justify-between">
      <div class="flex gap-4 items-center">
        <PatchStatusBadge class="text-sm" />
        <PatchMajorEvents />
      </div>
      <aside class="contents">
        <vscode-button class="self-center" appearance="secondary" @click="refetchPatchData">
          <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
          <span slot="start" class="codicon codicon-refresh"></span>Refresh data</vscode-button
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
