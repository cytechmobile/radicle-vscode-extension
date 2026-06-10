<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import type { Reaction } from '../../../types'
import { storeToRefs } from 'pinia'
import { truncateDid } from 'extensionUtils/string'
import { usePatchDetailStore } from '@/stores/patchDetailStore'

defineProps<{ reactions: Reaction[] }>()

const { localIdentity } = storeToRefs(usePatchDetailStore())

function getNormalizedAuthorsWithoutDids(reaction: Reaction): (string | 'you')[] {
  return reaction.authors.map((author) => {
    if (localIdentity.value?.id === author.id) {
      return 'you' as const
    }

    return author.alias ?? truncateDid(author.id)
  })
}

function getAuthorDisplayWithDid(author: Reaction['authors'][number]): string {
  if (localIdentity.value?.id === author.id) {
    return `you (${truncateDid(localIdentity.value.id)})`
  }

  return author.alias ? `${author.alias} (${truncateDid(author.id)})` : truncateDid(author.id)
}

function getNormalizedAuthorsWithDids(reaction: Reaction): string[] {
  return reaction.authors.map(getAuthorDisplayWithDid)
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
          >
            {{ part.value }}
          </span>
          <template v-else-if="part.type === 'literal'">{{ part.value }}</template>
        </template>
      </template>
      <template v-else>
        {{ reaction.emoji }}
        <span
          class="font-mono"
          :class="{
            'involves-local-identity': reaction.authors.find(
              (author) => localIdentity?.id === author.id,
            ),
          }"
        >
          {{ reaction.authors.length }}
        </span>
      </template>
    </span>
  </div>
</template>

<style scoped>
.involves-local-identity {
  font-style: italic;
}
</style>
