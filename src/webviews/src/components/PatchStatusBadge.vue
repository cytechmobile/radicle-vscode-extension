<script setup lang="ts">
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeRadio,
  vsCodeRadioGroup,
} from '@vscode/webview-ui-toolkit'
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref, toRaw, useTemplateRef, watchEffect } from 'vue'
import { isLocalIdAuthedToEditPatchStatus } from 'extensionHelpers/patch'
import { assertUnreachable } from 'extensionUtils/assertions'
import { notifyExtension } from 'extensionUtils/webview-messaging'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import PatchStatusIcon from './PatchStatusIcon.vue'

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeRadioGroup(), vsCodeRadio())

const { patch, delegates, firstRevision, localIdentity } = storeToRefs(usePatchDetailStore())
const status = computed(() => patch.value.state.status)

const isAuthedToEditStatus = computed(() => {
  const localId = localIdentity.value?.id
  if (!localId) {
    return false
  }

  return isLocalIdAuthedToEditPatchStatus(
    patch.value.state.status,
    delegates.value,
    firstRevision.value,
    localId,
  )
})

const btnStartEditingRef = useTemplateRef<HTMLElement>('btnStartEditingRef')
const btnStopEditingRef = useTemplateRef<HTMLElement>('btnStopEditingRef')
const isEditingStatus = ref(false)
function toggleStatusEditing(ev: PointerEvent) {
  isEditingStatus.value = !isEditingStatus.value

  const isKeyboardClick = ev.detail === 0 && !ev.pointerType
  if (isKeyboardClick) {
    nextTick(() => {
      isEditingStatus.value
        ? btnStopEditingRef.value?.focus()
        : btnStartEditingRef.value?.focus()
    })
  }
}

const radioGroupRef = useTemplateRef('radioGroupRef')
const radioDraftRef = useTemplateRef<HTMLElement & { checked: boolean }>('radioDraftRef')
const radioOpenRef = useTemplateRef<HTMLElement & { checked: boolean }>('radioOpenRef')
const radioArchivedRef = useTemplateRef<HTMLElement & { checked: boolean }>('radioArchivedRef')

// <vscode-radio checked> is bugged from the HTML side, so we have to do it manually with JS
watchEffect(() => {
  if (
    radioGroupRef.value &&
    !radioDraftRef.value?.checked &&
    !radioOpenRef.value?.checked &&
    !radioArchivedRef.value?.checked
  ) {
    nextTick(() => {
      switch (status.value) {
        case 'draft':
          radioDraftRef.value!.checked = true
          break
        case 'open':
          radioOpenRef.value!.checked = true
          break
        case 'archived':
          radioArchivedRef.value!.checked = true
          break
        case 'merged':
          break
        default:
          assertUnreachable(status.value)
      }
    })
  }
})

function onRadioChanged(ev: CustomEvent & { srcElement: HTMLInputElement }) {
  if (!ev.srcElement.checked) {
    return
  }

  notifyExtension({
    command: 'updatePatchStatus',
    payload: {
      patch: toRaw(patch.value),
      newStatus: ev.srcElement.value as 'draft' | 'open' | 'archived',
    },
  })
}
</script>

<template>
  <div class="contents">
    <span
      class="group relative inline-flex w-fit items-center gap-[0.5em] rounded-full px-[0.75em] py-[0.25em] text-vscode-editor-background"
      :style="`background: color-mix(in srgb-linear, var(--vscode-patch-${status}), var(--vscode-editor-foreground) 5%);`"
    >
      <span
        class="mb-[-0.125em]"
        :class="{
          'group-focus-within:invisible group-hover:invisible': isAuthedToEditStatus,
          'invisible': isEditingStatus,
        }"
      >
        <PatchStatusIcon :status="status" />
      </span>
      <span
        class="mb-[-0.125em] font-mono capitalize"
        :class="{
          'group-focus-within:invisible group-hover:invisible': isAuthedToEditStatus,
          'invisible': isEditingStatus,
        }"
      >
        {{ status }}
      </span>

      <vscode-button
        v-if="isAuthedToEditStatus && !isEditingStatus"
        ref="btnStartEditingRef"
        appearance="icon"
        title="Change Patch Status"
        class="absolute left-0 size-full text-vscode-editor-background opacity-0 focus:opacity-100 group-hover:opacity-100"
        @click="toggleStatusEditing"
      >
        <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
        <span slot="start" class="codicon codicon-edit"></span>
        Edit
      </vscode-button>
      <vscode-button
        v-if="isEditingStatus"
        ref="btnStopEditingRef"
        appearance="icon"
        title="Stop Editing Patch Status"
        class="absolute left-0 size-full text-vscode-editor-background"
        @click="toggleStatusEditing"
      >
        <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
        <span slot="start" class="codicon codicon-close"></span>
        Close
      </vscode-button>
    </span>
    <vscode-radio-group
      v-if="isEditingStatus"
      ref="radioGroupRef"
      name="Select status"
      orientation="vertical"
    >
      <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
      <label slot="label">Status:</label>
      <vscode-radio ref="radioDraftRef" value="draft" @change="onRadioChanged">
        Draft
      </vscode-radio>
      <vscode-radio ref="radioOpenRef" value="open" @change="onRadioChanged">
        Open
      </vscode-radio>
      <vscode-radio ref="radioArchivedRef" value="archived" @change="onRadioChanged">
        Archived
      </vscode-radio>
    </vscode-radio-group>
  </div>
</template>

<style scoped>
vscode-button[appearance='icon']:hover,
vscode-button[appearance='icon']:focus-visible {
  background-color: transparent;
  @apply backdrop-brightness-110;
}

vscode-button::part(control):focus-visible {
  @apply outline outline-offset-2 outline-[var(--focus-border)] rounded-full;
}
</style>
