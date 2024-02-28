<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { RadicleIdentity, Reaction } from '../../../types'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import { truncateMiddle } from 'extensionUtils/string'

defineProps<{ reactions: Reaction[] }>()

const { identities, localIdentity } = storeToRefs(usePatchDetailStore())

// TODO: delete resolveRadicleIdentity when httpd returns a full RadicleIdentity for reactions
// When doing so, also delete:
//  - `localIdentity` from `PatchDetailInjectedState`
//  - `identities` from `patchDetailStore`
function resolveRadicleIdentity(id: string): RadicleIdentity | undefined {
  return identities.value.find((identity) => identity.id.includes(id))
}
</script>

<template>
  <div class="flex flex-wrap gap-x-3 gap-y-[0.5em]">
    <span
      v-for="reaction in reactions"
      :key="reaction.emoji"
      :title="`Reaction from ${new Intl.ListFormat('en', {
        style: 'long',
        type: 'conjunction',
      }).format(
        reaction.authors.map((author) => resolveRadicleIdentity(author)?.alias ?? author),
      )}`"
      :class="{
        'modified-by-local-identity': reaction.authors.find((author) =>
          localIdentity?.id.includes(author),
        ),
      }"
    >
      <template v-if="reactions.flatMap((reaction) => reaction.authors).length <= 4">
        {{ reaction.emoji }}
        <template
          v-for="(part, index) in new Intl.ListFormat('en', {
            style: 'short',
            type: 'unit',
          }).formatToParts(
            reaction.authors.map(
              (author) => resolveRadicleIdentity(author)?.alias ?? truncateMiddle(author),
            ),
          )"
          :key="index"
        >
          <span v-if="part.type === 'element'" class="font-mono">{{ part.value }}</span>
          <template v-else-if="part.type === 'literal'">{{ part.value }}</template>
        </template>
      </template>
      <template v-else>
        {{ reaction.emoji }}
        <span class="font-mono">{{ reaction.authors.length }}</span>
      </template>
    </span>
  </div>
</template>

<style scoped>
.modified-by-local-identity {
  @apply outline outline-offset-1;
  background-color: color-mix(in srgb, var(--vscode-editor-foreground) 7%, transparent);
  outline-color: color-mix(in srgb, var(--vscode-editor-foreground) 20%, transparent);
}
</style>
