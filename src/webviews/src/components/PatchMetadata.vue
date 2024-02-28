<script setup lang="ts">
import { provideVSCodeDesignSystem, vsCodeButton } from '@vscode/webview-ui-toolkit'
import { storeToRefs } from 'pinia'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import { notifyExtension } from 'extensionUtils/webview-messaging'
import { getIdentityAliasOrId, shortenHash } from 'extensionUtils/string'
import Metadatum from '@/components/Metadatum.vue'
import Reactions from '@/components/Reactions.vue'

provideVSCodeDesignSystem().register(vsCodeButton())

const { patch, authors, firstRevision } = storeToRefs(usePatchDetailStore())
// TODO: add an (orange?) info icon next to authors who's DID is seen for the first time among revisions of patches of this project with text "This is the first time a user with this DID submits a patch revision in this project"
</script>

<template>
  <aside>
    <pre
      v-if="patch.isCheckedOut"
      title="The Git branch associated with this Radicle patch is currently checked out"
      class="min-h-[1.5em]"
    >
✓ Checked out</pre
    >
    <Metadatum label="Patch id">
      <pre :title="patch.id">{{ shortenHash(patch.id) }}</pre>
      <template #aside>
        <vscode-button
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
      </template>
    </Metadatum>
    <Metadatum label="Authors">
      <pre v-for="author in authors" :key="author.id" :title="author.id">{{
        getIdentityAliasOrId(author)
      }}</pre>
    </Metadatum>
    <!-- TODO: show names of all unique committers across all revisions -->
    <Metadatum v-if="patch.labels.length" label="Labels">
      <code v-for="label in patch.labels" :key="label">{{ label }}</code>
    </Metadatum>
    <Metadatum v-if="firstRevision.reactions.length" label="Reactions">
      <Reactions :reactions="firstRevision.reactions" />
    </Metadatum>
  </aside>
</template>
