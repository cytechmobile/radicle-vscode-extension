<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { computedWithControl } from '@vueuse/core'
import type { Revision } from '../../../types'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import { getTimeAgo, getFormattedDate } from 'extensionUtils/time'
import { getIdentityAliasOrId, shortenHash } from 'extensionUtils/string'
import { getRevisionHoverTitle } from '@/helpers/patchDetail'

defineEmits<{ showRevision: [revision: Revision] }>()

const { patch, firstRevision, latestRevision, timeLocale } = storeToRefs(usePatchDetailStore())

// TODO: maninak show `accepted` review as major event, if the related revision got accepted?

const latestMerge = computed(() =>
  [...patch.value.merges].sort((m1, m2) => m1.timestamp - m2.timestamp).at(-1),
)
const latestMergeRevision = patch.value.revisions.find(
  (revision) => revision.id === latestMerge.value?.revision,
)
const shouldShowRevisionEvent = computed(() => patch.value.revisions.length >= 2)

const mergedTimeAgo = computedWithControl(
  latestMerge,
  () => latestMerge.value && getTimeAgo(latestMerge.value.timestamp),
)
const updatedTimeAgo = computedWithControl(latestRevision, () =>
  getTimeAgo(latestRevision.value.timestamp),
)
const createdTimeAgo = computedWithControl(firstRevision, () =>
  getTimeAgo(firstRevision.value.timestamp),
)
setInterval(() => {
  mergedTimeAgo.trigger()
  updatedTimeAgo.trigger()
  createdTimeAgo.trigger()
}, 30_000)
</script>

<template>
  <div class="flex flex-col gap-[0.5em]">
    <div v-if="latestMerge" class="leading-tight">
      Merged by
      <pre :title="latestMerge.author.id">{{ getIdentityAliasOrId(latestMerge.author) }}</pre>
      using revision
      <pre
        @click="latestMergeRevision && $emit('showRevision', latestMergeRevision)"
        :title="
          latestMergeRevision
            ? getRevisionHoverTitle(latestMergeRevision?.description)
            : latestMerge.revision
        "
        class="hover:cursor-pointer"
        >{{ shortenHash(latestMerge.revision) }}</pre
      >
      &ensp;<wbr /><pre :title="getFormattedDate(latestMerge.timestamp, timeLocale)">{{
        mergedTimeAgo
      }}</pre>
    </div>
    <div v-if="shouldShowRevisionEvent" class="leading-tight">
      Last updated by
      <pre :title="latestRevision.author.id">{{
        getIdentityAliasOrId(latestRevision.author)
      }}</pre>
      with revision
      <pre
        @click="$emit('showRevision', latestRevision)"
        :title="getRevisionHoverTitle(latestRevision.description)"
        class="hover:cursor-pointer"
        >{{ shortenHash(latestRevision.id) }}</pre
      >&ensp;<wbr /><pre :title="getFormattedDate(latestRevision.timestamp, timeLocale)">{{
        updatedTimeAgo
      }}</pre>
    </div>
    <div class="leading-tight">
      Created by <pre :title="patch.author.id">{{ getIdentityAliasOrId(patch.author) }}</pre
      >&ensp;<wbr /><pre :title="getFormattedDate(firstRevision.timestamp, timeLocale)">{{
        createdTimeAgo
      }}</pre>
    </div>
  </div>
</template>
