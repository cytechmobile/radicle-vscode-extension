<script setup lang="ts">
import {
  provideVSCodeDesignSystem,
  vsCodePanels,
  vsCodePanelTab,
  vsCodePanelView,
} from '@vscode/webview-ui-toolkit'
import { ref, useTemplateRef } from 'vue'
import {
  breakpointsTailwind,
  useBreakpoints,
  useEventListener,
  useThrottleFn,
} from '@vueuse/core'
import { storeToRefs } from 'pinia'
import type { Revision } from '../../../types'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import { scrollToTemplateRef } from '@/utils/scrollToTemplateRef'
import PatchStatusBadge from '@/components/PatchStatusBadge.vue'
import PatchMajorEvents from '@/components/PatchMajorEvents.vue'
import PatchDetailButtons from '@/components/PatchDetailButtons.vue'
import PatchDetailTitleDescription from '@/components/PatchDetailTitleDescription.vue'
import PatchDetailActivity from '@/components/PatchDetailActivity.vue'
import PatchDetailRevision from '@/components/PatchDetailRevision.vue'

provideVSCodeDesignSystem().register(vsCodePanels(), vsCodePanelTab(), vsCodePanelView())

const { patchCommentForm } = storeToRefs(usePatchDetailStore())

const activityTabRef = useTemplateRef<HTMLElement>('activityTabRef')
const revisionTabRef = useTemplateRef<HTMLElement>('revisionTabRef')
const patchDetailRevisionRef = useTemplateRef<InstanceType<typeof PatchDetailRevision>>(
  'patchDetailRevisionRef',
)

const breakpoints = useBreakpoints(breakpointsTailwind)
const isWindowNarrowerThanSm = ref<boolean>()
const recalcIsWindowNarrowerThanSm = () =>
  (isWindowNarrowerThanSm.value = breakpoints.isSmaller('sm'))
recalcIsWindowNarrowerThanSm()
useEventListener('resize', useThrottleFn(recalcIsWindowNarrowerThanSm, 50))

function showRevision(revision: Revision) {
  patchDetailRevisionRef.value?.selectRevision(revision)
  revisionTabRef.value?.click()
  scrollToTemplateRef(patchDetailRevisionRef.value as HTMLElement | null)
}

function showCreateCommentForm(targetRevision: Revision) {
  patchCommentForm.value[targetRevision.id] = {
    comment: patchCommentForm.value[targetRevision.id]?.comment || '',
    status: 'editing',
  }
  activityTabRef.value?.click()
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
      <PatchDetailTitleDescription />

      <vscode-panels
        v-if="isWindowNarrowerThanSm"
        style="grid-area: section-primary"
        class="overflow-visible"
        aria-label="Detailed patch information"
      >
        <vscode-panel-tab
          ref="activityTabRef"
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
            v-if="patchDetailRevisionRef?.selectedRevision"
            :show-heading="false"
            :selected-revision="patchDetailRevisionRef?.selectedRevision"
          />
        </vscode-panel-view>
        <vscode-panel-view class="pt-5 px-0 pb-0">
          <PatchDetailRevision
            ref="patchDetailRevisionRef"
            @show-create-comment-form="showCreateCommentForm"
            :show-heading="false"
            class="h-fit"
          />
        </vscode-panel-view>
      </vscode-panels>

      <PatchDetailActivity
        v-if="!isWindowNarrowerThanSm && patchDetailRevisionRef?.selectedRevision"
        @show-revision="showRevision"
        show-heading
        :selected-revision="patchDetailRevisionRef?.selectedRevision"
        style="grid-area: section-primary"
      />
      <PatchDetailRevision
        v-if="!isWindowNarrowerThanSm"
        ref="patchDetailRevisionRef"
        @show-create-comment-form="showCreateCommentForm"
        show-heading
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
