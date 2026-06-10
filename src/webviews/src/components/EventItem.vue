<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { defineProps } from 'vue'
import { getFormattedDate, getTimeAgo } from 'extensionUtils/time'
import { usePatchDetailStore } from '@/stores/patchDetailStore'

defineProps<{
  when: number
  codicon: string
}>()

const { timeLocale } = storeToRefs(usePatchDetailStore())
</script>

<template>
  <li class="col-span-3 grid grid-cols-subgrid">
    <pre
      v-if="!Number.isNaN(when)"
      :title="getFormattedDate(when, timeLocale)"
      class="justify-self-end"
      >{{ getTimeAgo(when, 'mini') }}</pre
    >
    <span v-else class="codicon codicon-blank no-underline"></span>
    <span class="codicon no-underline" :class="[codicon]"></span>
    <div><slot></slot></div>
  </li>
</template>
