<script setup lang="ts">
import { defineProps } from 'vue'
import { storeToRefs } from 'pinia'
import { getFormattedDate, getTimeAgo } from 'extensionUtils/time'
import { usePatchDetailStore } from '@/stores/patchDetailStore'

defineProps<{
  when: number
  codicon: string
}>()

const { timeLocale } = storeToRefs(usePatchDetailStore())
</script>

<template>
  <li class="grid grid-cols-subgrid col-span-3">
    <pre :title="getFormattedDate(when, timeLocale)" class="justify-self-end">{{
      getTimeAgo(when, 'mini')
    }}</pre>
    <span :class="['no-underline codicon', codicon]"></span>
    <div><slot></slot></div>
  </li>
</template>
