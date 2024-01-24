<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { computedWithControl } from '@vueuse/core'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import { getTimeAgo, getFormattedDate } from 'extensionUtils/time'
import { getIdentityAliasOrId, shortenHash } from 'extensionUtils/string'

const { patch, firstRevision, latestRevision } = storeToRefs(usePatchDetailStore())

// TODO: maninak use locale in `getFormattedDate()` from `vscode.env.language`
// TODO: maninak show `accepted` review as major event, if the related revision got accepted?

const latestMerge = computed(() =>
  [...patch.value.merges].sort((m1, m2) => m1.timestamp - m2.timestamp).at(-1),
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
      <pre :title="latestMerge.revision">{{ shortenHash(latestMerge.revision) }}</pre>
      <span v-if="!shouldShowRevisionEvent"
        >at commit
        <pre :title="latestMerge.commit">{{ shortenHash(latestMerge.commit) }}</pre></span
      >&ensp;<wbr /><pre :title="getFormattedDate(latestMerge.timestamp)">{{
        mergedTimeAgo
      }}</pre>
    </div>
    <div v-if="shouldShowRevisionEvent" class="leading-tight">
      Last updated by
      <pre :title="latestRevision.author.id">{{
        getIdentityAliasOrId(latestRevision.author)
      }}</pre>
      with revision
      <pre :title="latestRevision.id">{{ shortenHash(latestRevision.id) }}</pre> at commit
      <pre :title="latestRevision.oid">{{ shortenHash(latestRevision.oid) }}</pre
      >&ensp;<wbr /><pre :title="getFormattedDate(latestRevision.timestamp)">{{
        updatedTimeAgo
      }}</pre>
    </div>
    <div class="leading-tight">
      Created by <pre :title="patch.author.id">{{ getIdentityAliasOrId(patch.author) }}</pre
      >&ensp;<wbr /><pre :title="getFormattedDate(firstRevision.timestamp)">{{
        createdTimeAgo
      }}</pre>
    </div>
  </div>
</template>
