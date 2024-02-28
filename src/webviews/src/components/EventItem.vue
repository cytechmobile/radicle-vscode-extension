<script setup lang="ts">
import { defineProps } from 'vue'
import { getFormattedDate, getTimeAgo } from 'extensionUtils/time'

defineProps<{
  when: number
  codicon: string
}>()
</script>

<template>
  <li class="grid grid-cols-subgrid col-span-3">
    <pre :title="getFormattedDate(when)" class="justify-self-end">{{
      getTimeAgo(when, 'mini')
    }}</pre>
    <span :class="['no-underline codicon', codicon]"></span>
    <div><slot></slot></div>
  </li>
</template>
