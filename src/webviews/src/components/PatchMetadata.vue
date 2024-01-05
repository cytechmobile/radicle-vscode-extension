<script setup lang="ts">
import { provideVSCodeDesignSystem, vsCodeButton } from '@vscode/webview-ui-toolkit'
import { storeToRefs } from 'pinia'
import { usePatchDetailStore } from '@/stores/patchDetail'
import { notifyExtension } from 'extensionUtils/webview-messaging'
import { getIdentityAliasOrId, shortenHash } from 'extensionUtils/string'

provideVSCodeDesignSystem().register(vsCodeButton())

const { patch, authors } = storeToRefs(usePatchDetailStore())
// TODO: maninak auto update time-agos every 10s (?)
</script>

<template>
  <aside class="*:h-[1.5em]">
    <div class="flex items-center w-max group">
      Patch Id: &nbsp;
      <pre :title="patch.id">{{ shortenHash(patch.id) }}</pre>
      <vscode-button
        class="ml-1 invisible group-hover:visible"
        appearance="icon"
        title="Copy Patch Identifier to Clipboard"
        @click="
          notifyExtension({
            command: 'copyToClipboardAndNotify',
            payload: { textToCopy: patch.id }
          })
        "
      >
        <span class="codicon codicon-copy"></span>
      </vscode-button>
    </div>
    <div class="flex items-center w-max group">
      Authors: &nbsp;
      <span class="flex gap-[0.5em]">
        <pre v-for="author in authors" :key="author.id" :title="author.id">{{
          getIdentityAliasOrId(author)
        }}</pre>
      </span>
    </div>
    <div v-if="patch.labels.length" class="flex items-center w-max group">
      Labels: &nbsp;
      <span class="flex gap-[0.5em]"
        ><code v-for="label in patch.labels" :key="label">{{ label }}</code></span
      >
    </div>
  </aside>
</template>
