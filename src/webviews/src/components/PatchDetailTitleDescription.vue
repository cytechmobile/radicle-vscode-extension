<script setup lang="ts">
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeTextArea,
} from '@vscode/webview-ui-toolkit'
import { ref, watchEffect, nextTick, computed } from 'vue'
import { useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import PatchMetadata from '@/components/PatchMetadata.vue'
import Markdown from '@/components/Markdown.vue'
import { notifyExtension } from 'extensionUtils/webview-messaging'

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextArea())

const { patch, firstRevision, patchEditForm, delegates, localIdentity } =
  storeToRefs(usePatchDetailStore())

interface VscodeTextAreaEvent {
  target: { _value: string }
}
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

const isAuthedToEditTitleAndDescr = computed(() => {
  return [...delegates.value, firstRevision.value.author.id].includes(localIdentity.value?.id)
})

function beginPatchEditing() {
  patchEditForm.value.title ||= patch.value.title
  patchEditForm.value.descr ||= firstRevision.value.description
  patchEditForm.value.isEditing = true
  nextTick(() => titleTextAreaEl.value?.focus())
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
      class="pb-2 w-fit flex flex-col gap-y-3"
    >
      <vscode-text-area
        ref="titleTextAreaEl"
        :value="patchEditForm.title"
        @input="(ev: VscodeTextAreaEvent) => (patchEditForm.title = ev.target._value)"
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
        @input="(ev: VscodeTextAreaEvent) => (patchEditForm.descr = ev.target._value)"
        name="patch description"
        rows="6"
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
          <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
          <span slot="start" class="codicon codicon-save"></span>
          Save
        </vscode-button>
        <vscode-button
          appearance="secondary"
          title="Stop Editing and Discard Current Changes"
          @click="discardPatchEditForm"
        >
          <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
          <span slot="start" class="codicon codicon-discard"></span>
          Discard
        </vscode-button>
      </div>
    </form>
  </section>
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
</style>
