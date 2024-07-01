<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { defineProps } from 'vue'
import Markdown from 'vue3-markdown-it'
import 'highlight.js/styles/vs2015.css'

defineProps<{ source: string }>()
// TODO: add control to toggle raw/parsed markdown
</script>

<template>
  <Markdown :source="source" :emoji="{ shortcuts: {} }" class="parsed-md" />
</template>

<style>
:is(h1, h2, h3, h4, h5, h6) .parsed-md * {
  @apply m-0;
}

:where(.parsed-md) {
  @apply font-mono;

  > * {
    @apply max-w-prose break-words;
  }

  h1 {
    font-size: 2em;
    margin-block-start: 0.67em;
    margin-block-end: 0.67em;
  }

  pre code {
    @apply max-w-max;
  }

  ol {
    @apply ps-[26px];

    ul {
      list-style-type: square;
    }
  }

  ul {
    @apply ps-[18px];
    list-style-type: disc;

    li {
      @apply pl-2;
    }
  }

  ul ul {
    list-style-type: circle;
  }

  ul ul ul {
    list-style-type: square;
  }

  ul ul ul ul {
    list-style-type: disc;
  }

  ul ul ul ul ul {
    list-style-type: circle;
  }

  ul.contains-task-list {
    @apply list-none -ml-[30px];

    .task-list-item-checkbox {
      @apply align-middle;
    }
  }

  p:has(img):not(:has(:not(img))) {
    max-width: unset;
  }

  code.hljs[class*='language-'] {
    @apply relative;

    .langTag {
      @apply absolute top-1 right-2 text-xs text-zinc-400;
    }

    & > span[class*='hljs-']:first-of-type {
      @apply relative;
    }
  }

  & :first-child {
    @apply mt-0;
  }

  & :last-child {
    @apply mb-0;
  }
}
</style>
