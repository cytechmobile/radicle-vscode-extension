<script setup lang="ts">
import type { Revision } from '../../../types'
import {
  provideVSCodeDesignSystem,
  vsCodePanels,
  vsCodePanelTab,
  vsCodePanelView,
} from '@vscode/webview-ui-toolkit'
import {
  breakpointsTailwind,
  useBreakpoints,
  useEventListener,
  useThrottleFn,
} from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { ref, useTemplateRef } from 'vue'
import PatchDetailActivity from '@/components/PatchDetailActivity.vue'
import PatchDetailButtons from '@/components/PatchDetailButtons.vue'
import PatchDetailRevision from '@/components/PatchDetailRevision.vue'
import PatchDetailTitleDescription from '@/components/PatchDetailTitleDescription.vue'
import PatchMajorEvents from '@/components/PatchMajorEvents.vue'
import PatchStatusBadge from '@/components/PatchStatusBadge.vue'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import { scrollToTemplateRef } from '@/utils/scrollToTemplateRef'

provideVSCodeDesignSystem().register(vsCodePanels(), vsCodePanelTab(), vsCodePanelView())

const { patchCommentForm } = storeToRefs(usePatchDetailStore())

const activityTabRef = useTemplateRef<HTMLElement>('activityTabRef')
const revisionTabRef = useTemplateRef<HTMLElement>('revisionTabRef')
const patchDetailRevisionRef = useTemplateRef<InstanceType<typeof PatchDetailRevision>>(
  'patchDetailRevisionRef',
)

const breakpoints = useBreakpoints(breakpointsTailwind)
const isWindowNarrowerThanSm = ref<boolean>()
function recalcIsWindowNarrowerThanSm() {
  return (isWindowNarrowerThanSm.value = breakpoints.isSmaller('sm'))
}
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
    class="grid-areas-patch grid grid-cols-1 gap-x-9 gap-y-12 sm:grid-cols-[minmax(calc(50cqw_+_80px),_1fr)_minmax(95px,_1fr)] xl:grid-cols-2"
  >
    <header class="flex justify-between gap-4" style="grid-area: header">
      <div class="flex flex-wrap items-center gap-4">
        <PatchStatusBadge class="text-sm" />
        <PatchMajorEvents @show-revision="showRevision" />
      </div>
      <aside class="flex shrink-0 flex-col gap-2 *:w-full">
        <PatchDetailButtons />
      </aside>
    </header>
    <main
      class="row-span-3 grid grid-cols-subgrid grid-rows-subgrid sm:col-span-2 sm:row-span-2"
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
        <vscode-panel-view class="px-0 pb-0 pt-5">
          <PatchDetailActivity
            v-if="patchDetailRevisionRef?.selectedRevision"
            :show-heading="false"
            :selected-revision="patchDetailRevisionRef?.selectedRevision"
          />
        </vscode-panel-view>
        <vscode-panel-view class="px-0 pb-0 pt-5">
          <PatchDetailRevision
            ref="patchDetailRevisionRef"
            :show-heading="false"
            class="h-fit"
            @show-create-comment-form="showCreateCommentForm"
          />
        </vscode-panel-view>
      </vscode-panels>

      <PatchDetailActivity
        v-if="!isWindowNarrowerThanSm && patchDetailRevisionRef?.selectedRevision"
        show-heading
        :selected-revision="patchDetailRevisionRef?.selectedRevision"
        style="grid-area: section-primary"
        @show-revision="showRevision"
      />
      <PatchDetailRevision
        v-if="!isWindowNarrowerThanSm"
        ref="patchDetailRevisionRef"
        show-heading
        class="hidden h-fit sm:block"
        style="grid-area: section-secondary"
        @show-create-comment-form="showCreateCommentForm"
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
