<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref, toRaw, watchEffect } from 'vue'
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeRadioGroup,
  vsCodeRadio,
} from '@vscode/webview-ui-toolkit'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import PatchStatusIcon from './PatchStatusIcon.vue'
import { assertUnreachable } from 'extensionUtils/assertions'
import { notifyExtension } from 'extensionUtils/webview-messaging'
import { isLocalIdAuthedToEditPatchStatus } from 'extensionHelpers/patch'

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

const btnStartEditingEl = ref<HTMLElement>()
const btnStopEditingEl = ref<HTMLElement>()
const isEditingStatus = ref(false)
function toggleStatusEditing(ev: PointerEvent) {
  isEditingStatus.value = !isEditingStatus.value

  const isKeyboardClick = ev.detail === 0 && !ev.pointerType
  if (isKeyboardClick) {
    nextTick(() => {
      isEditingStatus.value
        ? btnStopEditingEl.value?.focus()
        : btnStartEditingEl.value?.focus()
    })
  }
}

const radioGroupEl = ref<HTMLElement>()
const radioDraftEl = ref<HTMLInputElement>()
const radioOpenEl = ref<HTMLInputElement>()
const radioArchivedEl = ref<HTMLInputElement>()

// <vscode-radio checked> is bugged from the HTML side, so we have to do it manually with JS
watchEffect(() => {
  if (
    radioGroupEl.value &&
    !radioDraftEl.value?.checked &&
    !radioOpenEl.value?.checked &&
    !radioArchivedEl.value?.checked
  ) {
    nextTick(() => {
      switch (status.value) {
        case 'draft':
          radioDraftEl.value!.checked = true
          break
        case 'open':
          radioOpenEl.value!.checked = true
          break
        case 'archived':
          radioArchivedEl.value!.checked = true
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
      class="relative rounded-full px-[0.75em] py-[0.25em] inline-flex items-center w-fit text-vscode-editor-background gap-[0.5em] group"
      :style="`background: color-mix(in srgb-linear, var(--vscode-patch-${status}), var(--vscode-editor-foreground) 5%);`"
    >
      <span
        class="-mb-[0.125em]"
        :class="{
          'group-hover:invisible group-focus-within:invisible': isAuthedToEditStatus,
          invisible: isEditingStatus,
        }"
      >
        <PatchStatusIcon :status="status" />
      </span>
      <span
        class="-mb-[0.125em] capitalize font-mono"
        :class="{
          'group-hover:invisible group-focus-within:invisible': isAuthedToEditStatus,
          invisible: isEditingStatus,
        }"
      >
        {{ status }}
      </span>

      <vscode-button
        v-if="isAuthedToEditStatus && !isEditingStatus"
        ref="btnStartEditingEl"
        @click="toggleStatusEditing"
        appearance="icon"
        title="Change Patch Status"
        class="absolute left-0 w-full h-full opacity-0 focus:opacity-100 text-vscode-editor-background group-hover:opacity-100"
      >
        <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
        <span class="codicon codicon-edit" slot="start"></span>
        Edit
      </vscode-button>
      <vscode-button
        v-if="isEditingStatus"
        ref="btnStopEditingEl"
        @click="toggleStatusEditing"
        appearance="icon"
        title="Stop Editing Patch Status"
        class="absolute left-0 w-full h-full text-vscode-editor-background"
      >
        <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
        <span class="codicon codicon-close" slot="start"></span>
        Close
      </vscode-button>
    </span>
    <vscode-radio-group
      v-if="isEditingStatus"
      ref="radioGroupEl"
      name="Select status"
      orientation="vertical"
    >
      <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
      <label slot="label">Status:</label>
      <vscode-radio ref="radioDraftEl" @change="onRadioChanged" value="draft">
        Draft
      </vscode-radio>
      <vscode-radio ref="radioOpenEl" @change="onRadioChanged" value="open">Open</vscode-radio>
      <vscode-radio ref="radioArchivedEl" @change="onRadioChanged" value="archived">
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
