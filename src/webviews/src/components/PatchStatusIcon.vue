<script setup lang="ts">
import type { PatchStatus } from '../../../types'

defineProps<{
  status: PatchStatus
}>()
</script>

<template>
  <span
    v-if="status === 'draft'"
    class="codicon codicon-git-pull-request-draft"
    style="color: var(--vscode-patch-draft); font-size: 1em"
  ></span>
  <span
    v-if="status === 'open'"
    class="codicon codicon-git-pull-request"
    style="color: var(--vscode-patch-open); font-size: 1em"
  ></span>
  <span
    v-if="status === 'archived'"
    class="codicon codicon-git-pull-request-closed"
    style="color: var(--vscode-patch-archived); font-size: 1em"
  ></span>
  <span
    v-if="status === 'merged'"
    class="codicon codicon-git-merge"
    style="color: var(--vscode-patch-merged); font-size: 1em"
  ></span>
</template>
