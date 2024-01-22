<script setup lang="ts">
import { provideVSCodeDesignSystem, vsCodeButton } from '@vscode/webview-ui-toolkit'
import { storeToRefs } from 'pinia'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import { notifyExtension } from 'extensionUtils/webview-messaging'
import { getIdentityAliasOrId, shortenHash } from 'extensionUtils/string'

provideVSCodeDesignSystem().register(vsCodeButton())

const { patch, authors } = storeToRefs(usePatchDetailStore())
// TODO: maninak add an (orange?) info icon next to authors who's DID is seen for the first time among revisions of patches of this project with text "This is the first time a user with this DID submits a patch revision in this project"
</script>

<template>
  <aside class="*:min-h-[1.5em]">
    <pre
      v-if="patch.isCheckedOut"
      title="The Git branch associated with this Radicle patch is currently checked out"
    >
✓ Checked out</pre
    >
    <div class="flex flex-row items-center w-max gap-[0.5em] group">
      Id:
      <pre :title="patch.id">{{ shortenHash(patch.id) }}</pre>
      <vscode-button
        class="invisible group-hover:visible"
        appearance="icon"
        title="Copy Patch Identifier to Clipboard"
        @click="
          notifyExtension({
            command: 'copyToClipboardAndNotify',
            payload: { textToCopy: patch.id },
          })
        "
      >
        <span class="codicon codicon-copy"></span>
      </vscode-button>
    </div>
    <div class="flex flex-row items-center w-max gap-[0.5em]">
      Authors:
      <pre v-for="author in authors" :key="author.id" :title="author.id">{{
        getIdentityAliasOrId(author)
      }}</pre>
    </div>
    <div v-if="patch.labels.length" class="flex flex-row items-center w-max gap-[0.5em]">
      Labels:
      <code v-for="label in patch.labels" :key="label">{{ label }}</code>
    </div>
  </aside>
</template>
