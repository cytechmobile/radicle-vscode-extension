<script setup lang="ts">
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeTextArea,
  vsCodePanels,
  vsCodePanelTab,
  vsCodePanelView,
} from '@vscode/webview-ui-toolkit'
import { ref, computed, watchEffect, nextTick } from 'vue'
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
  vsCodeTextArea(),
  vsCodePanels(),
  vsCodePanelTab(),
  vsCodePanelView(),
)

const { patch, authors, firstRevision, latestRevision, patchEditForm } =
  storeToRefs(usePatchDetailStore())

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

// TODO: show "edited" indicators + timestamp (on hover) or full-blown list of edits, for each revision, comment, etc anything that has edits

const formEl = ref<HTMLElement>()
const titleTextAreaEl = ref<HTMLElement>()
const descrTextAreaEl = ref<HTMLElement>()

// TODO: maninak add button to toggle between markdown preview and editing
// TODO: maninak add ctrl/cmd + (B | I | E | K) listeners to toggle bold | italics | backtick-quote | link
watchEffect(() => {
  const titleEl = titleTextAreaEl.value?.shadowRoot?.querySelector('textarea')
  const descrEl = descrTextAreaEl.value?.shadowRoot?.querySelector('textarea')
  const els = [titleEl, descrEl].filter(Boolean)

  els.forEach((el) => {
    useEventListener(
      el,
      'keydown',
      (ev) => {
        if (ev.key === 'Escape') {
          patchEditForm.value.isEditing = false
        }
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
          submitPatchEditForm()
        }
      },
      { passive: true },
    )
    useEventListener(el, 'focus', () => resetTextAreaHeight(el), { passive: true })
    useEventListener(el, 'input', () => resetTextAreaHeight(el), { passive: true })
  })
})

function resetTextAreaHeight(el: HTMLTextAreaElement) {
  el.style.height = ''
  el.style.height = `${el.scrollHeight + 3}px` // additional offset needed to avoid scrollbar
  formEl.value?.scrollIntoView({ block: 'end', behavior: 'instant' })
}

function beginPatchEditing() {
  patchEditForm.value.title = patchEditForm.value.title || patch.value.title
  patchEditForm.value.descr = patchEditForm.value.descr || patch.value.revisions[0].description
  patchEditForm.value.isEditing = true
  nextTick(() => titleTextAreaEl.value?.focus())
}

function submitPatchEditForm() {
  patchEditForm.value.isEditing = false
  patch.value.title = patchEditForm.value.title.trim() // TODO: maninak delete and notify extension to change title instead
  patchEditForm.value.title = ''
  patch.value.revisions[0].description = patchEditForm.value.descr.trim() // TODO: maninak delete and notify extension to change title instead
  patchEditForm.value.descr = ''
}

function discardPatchEditForm() {
  patchEditForm.value.isEditing = false
}
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
      <section class="flex flex-col gap-y-4" style="grid-area: section-patch">
        <PatchMetadata />
        <div v-if="!patchEditForm.isEditing" class="max-w-fit flex flex-col gap-y-4 group">
          <div class="flex gap-x-2">
            <h1 class="my-0 text-3xl font-mono"><Markdown :source="patch.title" /></h1>
            <vscode-button
              appearance="icon"
              title="Edit Patch Title and Description"
              class="opacity-0 focus:opacity-100 group-hover:opacity-100"
              @click="beginPatchEditing"
            >
              <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
              <span class="codicon codicon-edit"></span>
            </vscode-button>
          </div>
          <Markdown :source="firstRevision.description" class="text-sm" />
        </div>
        <form
          v-else
          @submit.prevent
          ref="formEl"
          name="Edit patch title and description"
          class="pb-2 w-fit flex flex-col gap-y-3"
        >
          <vscode-text-area
            ref="titleTextAreaEl"
            :value="patchEditForm.title"
            @input="(ev: CustomEvent) => (patchEditForm.title = ev.target?._value)"
            name="patch title"
            rows="1"
            cols="100"
            resize="vertical"
            maxlength="400"
          >
            Patch Title:
          </vscode-text-area>
          <vscode-text-area
            ref="descrTextAreaEl"
            :value="patchEditForm.descr"
            @input="(ev: CustomEvent) => (patchEditForm.descr = ev.target?._value)"
            name="patch description"
            rows="5"
            cols="100"
            resize="vertical"
            maxlength="500000"
          >
            Patch Description:
          </vscode-text-area>
          <div class="w-full flex flex-row-reverse justify-start gap-x-2">
            <vscode-button
              appearance="primary"
              title="Save Changes to Radicle"
              @click="submitPatchEditForm"
            >
              Save
            </vscode-button>
            <vscode-button
              appearance="secondary"
              title="Stop Editing and Discard Current Changes"
              @click="discardPatchEditForm"
            >
              Discard
            </vscode-button>
          </div>
        </form>
      </section>

      <vscode-panels
        v-if="isWindowNarrowerThanSm"
        style="grid-area: section-primary"
        class="overflow-visible"
        aria-label="Detailed patch information"
      >
        <vscode-panel-tab
          title="Click to See All Events That Took Place During the Lifetime of the Patch"
          class="text-lg"
        >
          Activity
        </vscode-panel-tab>
        <vscode-panel-tab
          ref="revisionTabRef"
          title="Click to See Details of a Specific Revision of the Patch"
          class="text-lg"
        >
          Revision
        </vscode-panel-tab>
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
vscode-text-area::part(control) {
  min-height: 5ch;
  max-height: min(80ch, 65vh);
  field-sizing: content;
  @apply font-mono text-sm;
}

vscode-text-area::part(label) {
  margin-bottom: 0.5em;
}

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
