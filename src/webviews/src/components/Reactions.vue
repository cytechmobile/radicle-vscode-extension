<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Reaction } from '../../../types'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import { truncateDid } from 'extensionUtils/string'

defineProps<{ reactions: Reaction[] }>()

const { localIdentity } = storeToRefs(usePatchDetailStore())

// TODO: delete delete `identities` from `patchDetailStore` or move it into patchStore across all patches if not too slow
function getNormalizedAuthorsWithoutDids(reaction: Reaction): (string | 'you')[] {
  const normalizedAuthors = reaction.authors.map((author) =>
    localIdentity.value.id === author.id ? 'you' : author.alias ?? truncateDid(author.id),
  )

  return normalizedAuthors
}

function getNormalizedAuthorsWithDids(reaction: Reaction): string[] {
  const normalizedAuthors = reaction.authors.map((author) =>
    localIdentity.value.id === author.id
      ? `you (${truncateDid(localIdentity.value.id)})`
      : author.alias
        ? `${author.alias} (${truncateDid(author.id)})`
        : truncateDid(author.id),
  )

  return normalizedAuthors
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
      }).format(getNormalizedAuthorsWithDids(reaction))}`"
    >
      <template v-if="reactions.flatMap((reaction) => reaction.authors).length <= 4">
        {{ reaction.emoji }}
        <template
          v-for="(part, index) in new Intl.ListFormat('en', {
            style: 'short',
            type: 'unit',
          }).formatToParts(getNormalizedAuthorsWithoutDids(reaction))"
          :key="index"
        >
          <span
            v-if="part.type === 'element'"
            class="font-mono"
            :class="{
              'involves-local-identity': part.value === 'you',
            }"
            >{{ part.value }}</span
          >
          <template v-else-if="part.type === 'literal'">{{ part.value }}</template>
        </template>
      </template>
      <template v-else>
        {{ reaction.emoji }}
        <span
          class="font-mono"
          :class="{
            'involves-local-identity': reaction.authors.find(
              (author) => localIdentity.id === author.id,
            ),
          }"
          >{{ reaction.authors.length }}</span
        >
      </template>
    </span>
  </div>
</template>

<style scoped>
.involves-local-identity {
  font-style: italic;
}
</style>
