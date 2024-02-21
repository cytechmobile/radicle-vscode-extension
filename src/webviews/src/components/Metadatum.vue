<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { defineProps, useSlots } from 'vue'

defineProps<{ label: string }>()
const slots = useSlots()
</script>

<template>
  <div
    :class="[
      'max-w-fit min-h-[1.5em] flex flex-row gap-x-[0.5em]',
      slots.aside ? 'items-center group' : 'items-start',
    ]"
  >
    {{ label }}:
    <span :class="['max-w-fit flex flex-wrap', 'gap-x-[0.5em]']">
      <slot></slot>
    </span>
    <span v-if="slots.aside" class="invisible group-hover:visible">
      <slot name="aside"></slot>
    </span>
  </div>
</template>
