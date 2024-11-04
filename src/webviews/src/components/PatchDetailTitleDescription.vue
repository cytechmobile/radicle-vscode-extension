<script setup lang="ts">
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeTextArea,
} from '@vscode/webview-ui-toolkit'
import { ref, watchEffect, computed } from 'vue'
import { useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import PatchMetadata from '@/components/PatchMetadata.vue'
import Markdown from '@/components/Markdown.vue'
import { notifyExtension } from 'extensionUtils/webview-messaging'

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextArea())

const { patch, firstRevision, patchEditForm, delegates, localIdentity } =
  storeToRefs(usePatchDetailStore())

// TODO: maninak extract to usePatchDetailForm? composable

interface VscodeTextAreaEvent {
  target: { _value: string }
}
const formEl = ref<HTMLElement>()
const titleTextAreaEl = ref<HTMLElement>()
const descrTextAreaEl = ref<HTMLElement>()

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
    useEventListener(el, 'focus', alignViewportWithForm, { passive: true })
    useEventListener(el, 'input', alignViewportWithForm, { passive: true })
  })
})

function alignViewportWithForm() {
  formEl.value?.scrollIntoView({ block: 'end', behavior: 'instant' })
}

const isAuthedToEditTitleAndDescr = computed(() => {
  return [...delegates.value, firstRevision.value.author.id].includes(
    localIdentity.value?.id ?? '',
  )
})

function beginPatchEditing() {
  patchEditForm.value.title ||= patch.value.title
  patchEditForm.value.descr ||= firstRevision.value.description
  patchEditForm.value.isEditing = true
  setTimeout(() => {
    titleTextAreaEl.value?.focus()
    alignViewportWithForm()
  }, 0) // Vue.nextTick isn't cutting it
}

function submitPatchEditForm() {
  patchEditForm.value.isEditing = false
  notifyExtension({
    command: 'updatePatchTitleAndDescription',
    payload: {
      patchId: patch.value.id,
      newTitle: patchEditForm.value.title.trim(),
      newDescr: patchEditForm.value.descr.trim(),
      oldTitle: patch.value.title,
    },
  })
}

function discardPatchEditForm() {
  patchEditForm.value.isEditing = false
  patchEditForm.value.title = ''
  patchEditForm.value.descr = ''
}
</script>

<template>
  <section class="flex flex-col gap-y-4" style="grid-area: section-patch">
    <PatchMetadata />
    <div v-if="!patchEditForm.isEditing" class="max-w-fit flex flex-col gap-y-4 group">
      <div class="flex gap-x-2">
        <h1 class="my-0 text-3xl font-mono"><Markdown :source="patch.title" /></h1>
        <vscode-button
          v-if="isAuthedToEditTitleAndDescr"
          appearance="icon"
          title="Edit Patch Title and Description"
          class="opacity-0 focus:opacity-100 group-hover:opacity-100 sm:p-2"
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
      class="pb-2 flex flex-col gap-y-3"
    >
      <vscode-text-area
        ref="titleTextAreaEl"
        :value="patchEditForm.title"
        @input="(ev: VscodeTextAreaEvent) => (patchEditForm.title = ev.target._value)"
        placeholder="What does this patch do, in a nutshell?"
        name="patch title"
        resize="vertical"
        maxlength="400"
        >Patch Title:</vscode-text-area
      >
      <vscode-text-area
        ref="descrTextAreaEl"
        :value="patchEditForm.descr"
        @input="(ev: VscodeTextAreaEvent) => (patchEditForm.descr = ev.target._value)"
        placeholder="Describe the patch in more detail…"
        name="patch description"
        resize="vertical"
        maxlength="500000"
        >Patch Description:</vscode-text-area
      >
      <div class="w-full flex flex-row-reverse justify-start gap-x-2">
        <vscode-button
          appearance="primary"
          title="Save Changes to Radicle"
          @click="submitPatchEditForm"
          >Update</vscode-button
        >
        <vscode-button
          appearance="secondary"
          title="Stop Editing and Discard Current Changes"
          @click="discardPatchEditForm"
          >Discard</vscode-button
        >
      </div>
    </form>
  </section>
</template>

<style scoped>
form {
  @apply w-fit font-mono text-sm leading-[unset];
  min-width: min(100%, 68ch); /* results to allowing 65 chars before resizing to be wider */
}

vscode-text-area::part(control) {
  @apply font-mono text-sm;
  field-sizing: content;
  max-height: min(80ch, 65vh);
  word-break: break-word;
}

vscode-text-area[name*='title']::part(control) {
  max-height: 12ch; /* results to 4 lines of text */
}

vscode-text-area[name*='descr']::part(control) {
  min-height: 12ch; /* results to 4 lines of text */
}

vscode-text-area::part(label) {
  margin-bottom: 0.5em;
}
</style>
