<script setup lang="ts">
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeDropdown,
  vsCodeOption,
} from '@vscode/webview-ui-toolkit'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { getIdentityAliasOrId, shortenHash } from 'extensionUtils/string'
import { getFormattedDate } from 'extensionUtils/time'
import { notifyExtension } from 'extensionUtils/webview-messaging'
import type { Revision } from '../../../types'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import Markdown from '@/components/Markdown.vue'
import Metadatum from '@/components/Metadatum.vue'
import Reactions from './Reactions.vue'

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeDropdown(), vsCodeOption())

const props = defineProps<{
  showHeading: boolean
  selectedRevisionOption: string
  selectedRevision: Revision
  revisionOptionsMap: Map<string, Revision>
}>()

defineEmits<{ didSelectOption: [option: string] }>()

const { firstRevision, timeLocale } = storeToRefs(usePatchDetailStore())

const shouldHideRevisionDescription = computed(
  () =>
    props.selectedRevision.description && props.selectedRevision.id === firstRevision.value.id,
)
const selectedRevisionAcceptedReviews = computed(() =>
  props.selectedRevision.reviews.filter((review) => review.verdict === 'accept'),
)
const selectedRevisionRejectedReviews = computed(() =>
  props.selectedRevision.reviews.filter((review) => review.verdict === 'reject'),
)
</script>

<template>
  <section>
    <h2 v-if="showHeading" class="text-lg font-normal mt-0 mb-3">Revision</h2>
    <vscode-dropdown
      @change="(ev: CustomEvent) => $emit('didSelectOption', ev.detail._value)"
      :value="selectedRevisionOption"
      title="Select a patch revision to see more info about it"
      class="max-w-full mb-3 font-mono rounded-none"
    >
      <vscode-option
        v-for="revisionOption in revisionOptionsMap.keys()"
        :key="revisionOption"
        class="font-mono"
        >{{ revisionOption }}</vscode-option
      >
    </vscode-dropdown>
    <Metadatum label="Id">
      <pre :title="selectedRevision.id">{{ shortenHash(selectedRevision.id) }}</pre>
      <template #aside>
        <vscode-button
          appearance="icon"
          title="Copy Revision Identifier to Clipboard"
          @click="
            notifyExtension({
              command: 'copyToClipboardAndNotify',
              payload: { textToCopy: selectedRevision.id },
            })
          "
        >
          <span class="codicon codicon-copy"></span>
        </vscode-button>
      </template>
    </Metadatum>
    <Metadatum label="Author">
      <pre :title="selectedRevision.author.id">{{
        getIdentityAliasOrId(selectedRevision.author)
      }}</pre>
    </Metadatum>
    <Metadatum
      v-if="selectedRevisionAcceptedReviews.length || selectedRevisionRejectedReviews.length"
      label="Reviews"
    >
      <span class="flex items-center gap-[1em]">
        <span
          v-if="selectedRevisionAcceptedReviews.length"
          class="flex items-start gap-x-[0.5em]"
        >
          <span class="codicon codicon-thumbsup" title="Accepted revision"></span>
          <span v-for="review in selectedRevisionAcceptedReviews" :key="review.timestamp">
            <pre :title="review.author.id">{{ getIdentityAliasOrId(review.author) }}</pre>
          </span>
        </span>
        <span
          v-if="selectedRevisionRejectedReviews.length"
          class="flex items-start gap-x-[0.5em]"
        >
          <span class="codicon codicon-thumbsdown" title="Rejected revision"></span>
          <span v-for="review in selectedRevisionRejectedReviews" :key="review.timestamp">
            <pre :title="selectedRevision.author.id">{{
              getIdentityAliasOrId(selectedRevision.author)
            }}</pre>
          </span>
        </span>
      </span>
    </Metadatum>
    <Metadatum label="Date">
      <span
        :title="new Date(selectedRevision.timestamp * 1000).toISOString()"
        class="font-mono"
        >{{ getFormattedDate(selectedRevision.timestamp, timeLocale) }}</span
      >
    </Metadatum>
    <Metadatum label="Latest commit">
      <pre :title="selectedRevision.oid">{{ shortenHash(selectedRevision.oid) }}</pre>
    </Metadatum>
    <Metadatum label="Based on commit">
      <pre :title="selectedRevision.base">{{ shortenHash(selectedRevision.base) }}</pre>
    </Metadatum>
    <Metadatum v-if="selectedRevision.reactions.length" label="Reactions">
      <Reactions :reactions="selectedRevision.reactions" />
    </Metadatum>
    <!-- TODO: show names of all unique committers -->
    <div v-if="selectedRevision.description" class="mt-4">
      <details v-if="shouldHideRevisionDescription">
        <summary style="color: var(--vscode-foreground)" title="Click to expand/collapse"
          >Description</summary
        >
        <Markdown :source="selectedRevision.description" class="mt-[0.25em] text-sm" />
      </details>
      <Markdown v-else :source="selectedRevision.description" class="text-sm" />
    </div>
  </section>
</template>
