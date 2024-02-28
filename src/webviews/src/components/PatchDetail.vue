<script setup lang="ts">
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodePanels,
  vsCodePanelTab,
  vsCodePanelView,
} from '@vscode/webview-ui-toolkit'
import { ref, onMounted, nextTick, computed } from 'vue'
import {
  breakpointsTailwind,
  useBreakpoints,
  useEventListener,
  useThrottleFn,
} from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { getIdentityAliasOrId, shortenHash } from 'extensionUtils/string'
import { getTimeAgo } from 'extensionUtils/time'
import type { Revision } from '../../../types'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import { scrollToTemplateRef } from '@/utils/scrollToTemplateRef'
import PatchStatusBadge from '@/components/PatchStatusBadge.vue'
import PatchMajorEvents from '@/components/PatchMajorEvents.vue'
import PatchDetailButtons from '@/components/PatchDetailButtons.vue'
import PatchMetadata from '@/components/PatchMetadata.vue'
import PatchDetailActivity from '@/components/PatchDetailActivity.vue'
import PatchDetailRevision from '@/components/PatchDetailRevision.vue'
import Markdown from '@/components/Markdown.vue'

provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodePanels(),
  vsCodePanelTab(),
  vsCodePanelView(),
)

const { patch, authors, firstRevision, latestRevision } = storeToRefs(usePatchDetailStore())

const revisionTabRef = ref<HTMLElement>()
const revisionSectionRef = ref<HTMLElement>()

const breakpoints = useBreakpoints(breakpointsTailwind)
const isWindowNarrowerThanSm = ref<boolean>()
const recalcIsWindowNarrowerThanSm = () =>
  (isWindowNarrowerThanSm.value = breakpoints.isSmaller('sm'))
recalcIsWindowNarrowerThanSm()
useEventListener('resize', useThrottleFn(recalcIsWindowNarrowerThanSm, 50))

const revisionOptionsMap = computed(
  () =>
    new Map(
      [...patch.value.revisions]
        .reverse()
        .map((revision) => [assembleRevisionOptionLabel(revision), revision]),
    ),
)
// TODO: if patch is merged pre-select revision that got merged
const selectedRevisionOption = ref(assembleRevisionOptionLabel(latestRevision.value))
const selectedRevision = computed(
  () =>
    revisionOptionsMap.value.get(selectedRevisionOption.value) as NonNullable<
      ReturnType<(typeof revisionOptionsMap)['value']['get']>
    >,
)

function selectAndScrollToRevision(revision: Revision) {
  selectedRevisionOption.value = assembleRevisionOptionLabel(revision)
  isWindowNarrowerThanSm.value && revisionTabRef.value?.click()
  scrollToTemplateRef(revisionSectionRef.value)
}

function assembleRevisionOptionLabel(revision: Revision): string {
  const id = shortenHash(revision.id)
  const timeAgo = getTimeAgo(revision.timestamp, 'mini')
  const state = [
    patch.value.merges.map((merge) => merge.revision).includes(revision.id) &&
      `merged${patch.value.merges.length >= 2 ? `/${patch.value.merges.length}` : ''}`,
    revision.reviews.find((review) => review.verdict === 'accept') && 'accepted',
    revision.reviews.find((review) => review.verdict === 'reject') && 'rejected',
    patch.value.revisions.length >= 2 && revision.id === firstRevision.value.id && 'first',
    patch.value.revisions.length >= 2 && revision.id === latestRevision.value.id && 'latest',
    patch.value.revisions.length == 1 && 'sole',
  ].filter(Boolean)
  const parsedState = state.length ? ` [${state.join(', ')}]` : ''
  const author = authors.value.length >= 2 ? ` ${getIdentityAliasOrId(revision.author)}` : ''
  const label = `${id}${parsedState} ${timeAgo}${author}`

  return label
}

onMounted(() => {
  nextTick(() => {
    document.querySelectorAll("code.hljs[class*='language-']").forEach((highlightedCodeEl) => {
      const highlightedCodeElClass = highlightedCodeEl.classList.value

      const langTagEl = document.createElement('span')
      langTagEl.textContent = highlightedCodeElClass
        .replace('hljs ', '')
        .replaceAll(/language-/g, '')
        .trim()
      langTagEl.classList.add('langTag')

      highlightedCodeEl.insertBefore(langTagEl, highlightedCodeEl.firstChild)
    })
  })
})

// TODO: show "edited" indicators + timestamp (on hover) or full-blown list of edits, for each revision, comment, etc anything that has edits
</script>

<template>
  <article
    class="grid grid-cols-1 sm:grid-cols-[minmax(calc(50cqw_+_80px),_1fr)_minmax(95px,_1fr)] xl:grid-cols-2 grid-areas-patch gap-x-9 gap-y-12"
  >
    <header class="flex gap-4 justify-between" style="grid-area: header">
      <div class="flex flex-wrap gap-4 items-center">
        <PatchStatusBadge class="text-sm" />
        <PatchMajorEvents />
      </div>
      <aside class="flex flex-col gap-2 *:w-full">
        <PatchDetailButtons />
      </aside>
    </header>
    <main
      class="grid grid-rows-subgrid grid-cols-subgrid row-span-3 sm:row-span-2 sm:col-span-2"
    >
      <section style="grid-area: section-patch">
        <PatchMetadata />
        <h1 class="my-4 text-3xl font-mono"><Markdown :source="patch.title" /></h1>
        <Markdown :source="firstRevision.description" class="text-sm" />
      </section>

      <vscode-panels
        v-if="isWindowNarrowerThanSm"
        style="grid-area: section-primary"
        class="overflow-visible"
        aria-label="Detailed patch information"
      >
        <vscode-panel-tab
          title="Click to see all events which took place during the lifetime of the patch"
          class="text-lg"
          >Activity</vscode-panel-tab
        >
        <vscode-panel-tab
          ref="revisionTabRef"
          title="Click to see details of a specific revision of the patch"
          class="text-lg"
          >Revision</vscode-panel-tab
        >
        <vscode-panel-view class="pt-5 px-0 pb-0">
          <PatchDetailActivity
            @show-revision="selectAndScrollToRevision"
            :show-heading="false"
          />
        </vscode-panel-view>
        <vscode-panel-view class="pt-5 px-0 pb-0">
          <PatchDetailRevision
            ref="revisionSectionRef"
            @did-select-option="(newOption) => (selectedRevisionOption = newOption)"
            :show-heading="false"
            :selected-revision="selectedRevision"
            :selected-revision-option="selectedRevisionOption"
            :revision-options-map="revisionOptionsMap"
            class="h-fit"
          />
        </vscode-panel-view>
      </vscode-panels>

      <PatchDetailActivity
        v-if="!isWindowNarrowerThanSm"
        @show-revision="selectAndScrollToRevision"
        show-heading
        style="grid-area: section-primary"
      />
      <PatchDetailRevision
        v-if="!isWindowNarrowerThanSm"
        ref="revisionSectionRef"
        @did-select-option="(newOption) => (selectedRevisionOption = newOption)"
        show-heading
        :selected-revision="selectedRevision"
        :selected-revision-option="selectedRevisionOption"
        :revision-options-map="revisionOptionsMap"
        class="hidden sm:block h-fit"
        style="grid-area: section-secondary"
      />
    </main>
  </article>
</template>

<style scoped>
.grid-areas-patch {
  grid-template-areas:
    'header           '
    'section-patch    '
    'section-primary  '
    'section-secondary';

  @media screen(sm) {
    grid-template-areas:
      'header          header           '
      'section-patch   section-patch    '
      'section-primary section-secondary';
  }
}
</style>
