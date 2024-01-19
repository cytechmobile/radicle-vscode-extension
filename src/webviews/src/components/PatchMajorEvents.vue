<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { computedWithControl, useIntervalFn } from '@vueuse/core'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import { getTimeAgo, getFormattedDate } from 'extensionUtils/time'
import { getIdentityAliasOrId, shortenHash } from 'extensionUtils/string'

const { patch, firstRevision, latestRevision } = storeToRefs(usePatchDetailStore())

// TODO: maninak use locale in `getFormattedDate()` from `vscode.env.language`

const latestMerge = computed(() =>
  [...patch.value.merges].sort((m1, m2) => m1.timestamp - m2.timestamp).at(-1)
)
const shouldShowRevisionEvent = computed(() => patch.value.revisions.length >= 2)

const createdTimeAgo = computedWithControl(firstRevision, () =>
  getTimeAgo(firstRevision.value.timestamp)
)
// Somehow this useIntervalFn() triggers re-rendering of the whole component including
// re-calculation of all other `getTimeAgo()` calls too.
// Not sure if a vueuse bug or a feature but good enough for now. :shrug:
useIntervalFn(() => createdTimeAgo.trigger(), 3_000)
</script>

<template>
  <div class="flex flex-col gap-[0.5em]">
    <div v-if="latestMerge">
      Merged by
      <pre :title="latestMerge.author.id">{{ getIdentityAliasOrId(latestMerge.author) }}</pre>
      using revision
      <pre :title="latestMerge.revision">{{ shortenHash(latestMerge.revision) }}</pre>
      <span v-if="!shouldShowRevisionEvent"
        >at commit
        <pre :title="latestMerge.commit">{{ shortenHash(latestMerge.commit) }}</pre></span
      >&ensp;<wbr /><pre :title="getFormattedDate(latestMerge.timestamp)">{{
        getTimeAgo(latestMerge.timestamp)
      }}</pre>
    </div>
    <div v-if="shouldShowRevisionEvent">
      Last updated by
      <pre :title="latestRevision.author.id">{{
        getIdentityAliasOrId(latestRevision.author)
      }}</pre>
      with revision
      <pre :title="latestRevision.id">{{ shortenHash(latestRevision.id) }}</pre> at commit
      <pre :title="latestRevision.oid">{{ shortenHash(latestRevision.oid) }}</pre
      >&ensp;<wbr /><pre :title="getFormattedDate(latestRevision.timestamp)">{{
        getTimeAgo(latestRevision.timestamp)
      }}</pre>
    </div>
    <div>
      Created by <pre :title="patch.author.id">{{ getIdentityAliasOrId(patch.author) }}</pre
      >&ensp;<wbr /><pre :title="getFormattedDate(firstRevision.timestamp)">{{
        createdTimeAgo
      }}</pre>
    </div>
  </div>
</template>
