<script setup lang="ts">
import type { PatchStatus } from '../../../types'

defineProps<{ status: PatchStatus }>()
</script>

<template>
  <span
    v-if="status === 'draft'"
    class="codicon codicon-git-pull-request-draft"
    style="font-size: 1em"
  ></span>
  <span
    v-if="status === 'open'"
    class="codicon codicon-git-pull-request"
    style="font-size: 1em"
  ></span>
  <span
    v-if="status === 'archived'"
    class="codicon codicon-git-pull-request-closed"
    style="font-size: 1em"
  ></span>
  <span
    v-if="status === 'merged'"
    class="codicon codicon-git-merge"
    style="font-size: 1em"
  ></span>
</template>
