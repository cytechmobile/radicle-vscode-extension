<script setup lang="ts">
import Counter from '@/components/Counter.vue'
import { registerWebviewMessageHandlers } from '@/composables/registerWebviewMessageHandlers'

// TODO: maninak add linter and hook-up scripts
// TODO: maninak add component auto-import
// TODO: maninak add auto-import vue-use

registerWebviewMessageHandlers()
</script>

<template>
  <Counter/>
</template>
