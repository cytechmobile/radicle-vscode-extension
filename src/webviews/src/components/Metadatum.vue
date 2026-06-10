<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { defineProps, useSlots } from 'vue'

defineProps<{ label: string }>()
const slots = useSlots()
</script>

<template>
  <div
    class="flex min-h-[1.5em] max-w-fit flex-row gap-x-[0.5em]"
    :class="[slots.aside ? 'group items-center' : 'items-start']"
  >
    {{ label }}:
    <span class="flex max-w-fit flex-wrap gap-x-[0.5em]">
      <slot></slot>
    </span>
    <span v-if="slots.aside" class="invisible group-hover:visible">
      <slot name="aside"></slot>
    </span>
  </div>
</template>
