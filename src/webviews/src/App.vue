<script setup lang="ts">
import TheCounter from '@/components/TheCounter.vue'
import { registerWebviewMessageHandlers } from '@/composables/registerWebviewMessageHandlers'

registerWebviewMessageHandlers()
</script>

<template>
  <TheCounter />
</template>

<style>
@import '@/assets/codicon.css';
</style>
