<script setup lang="ts">
import Counter from '@/components/Counter.vue'
import { registerWebviewMessageHandlers } from '@/composables/registerWebviewMessageHandlers'

registerWebviewMessageHandlers()
</script>

<template>
  <Counter/>
</template>

<style>
@import '@/assets/codicon.css';
</style>
