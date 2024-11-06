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

// Those `watchEffect()`s should run once each time the respective elements get created
watchEffect(() => {
  formEl.value &&
    useEventListener(
      formEl.value,
      'keydown',
      (ev) => {
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
          submitPatchEditForm()
        } else if (ev.key === 'Escape') {
          pausePatchEditing()
        } else if (ev.key === 'p' && ev.altKey) {
          togglePreviewMarkdown()
        }
      },
      { passive: true },
    )
})
watchEffect(() => {
  setTimeout(() => {
    titleTextAreaEl.value?.focus()
    alignViewportWithForm()
  }, 0) // Vue.nextTick isn't cutting it

  const titleEl = titleTextAreaEl.value?.shadowRoot?.querySelector('textarea')
  const descrEl = descrTextAreaEl.value?.shadowRoot?.querySelector('textarea')
  const els = [titleEl, descrEl].filter(Boolean)

  els.forEach((el) => {
    useEventListener(el, 'focus', alignViewportWithForm, { passive: true })
    useEventListener(el, 'input', alignViewportWithForm, { passive: true })
  })
})

function alignViewportWithForm() {
  formEl.value?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
}

function beginPatchEditing() {
  patchEditForm.value.title ||= patch.value.title
  patchEditForm.value.descr ||= firstRevision.value.description
  patchEditForm.value.status = 'editing'
}

function pausePatchEditing() {
  patchEditForm.value.status = 'off'
}

function submitPatchEditForm() {
  patchEditForm.value.status = 'off'
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
  patchEditForm.value.status = 'off'
  patchEditForm.value.title = ''
  patchEditForm.value.descr = ''
}

function togglePreviewMarkdown() {
  if (patchEditForm.value.status === 'editing') {
    patchEditForm.value.status = 'previewing'

    if (formEl.value) {
      formEl.value.tabIndex = 0 // allows <form>, otherwise  non-tabbable, to be `focus()`ed
      formEl.value.focus() // make form keyboard shortcuts still work after toggling MD preview
      formEl.value.tabIndex = -1 // clean-up
    }
  } else if (patchEditForm.value.status === 'previewing') {
    patchEditForm.value.status = 'editing'

    const elemToFocusBackTo = patchEditForm.value.descr
      ? descrTextAreaEl.value
      : titleTextAreaEl.value
    setTimeout(() => elemToFocusBackTo?.focus(), 0)
  }
}

const isAuthedToEditTitleAndDescr = computed(() => {
  return [...delegates.value, firstRevision.value.author.id].includes(
    localIdentity.value?.id ?? '',
  )
})
</script>

<template>
  <section class="flex flex-col gap-y-4" style="grid-area: section-patch">
    <PatchMetadata />
    <div class="flex flex-col gap-y-4">
      <div v-if="patchEditForm.status === 'off'" class="max-w-fit flex flex-col gap-y-4 group">
        <div class="flex gap-x-2">
          <h1 class="my-0 text-3xl font-mono"><Markdown :source="patch.title" /></h1>
          <vscode-button
            v-if="isAuthedToEditTitleAndDescr && patchEditForm.status === 'off'"
            appearance="icon"
            title="Edit Patch Title and Description"
            class="opacity-0 focus:opacity-100 group-hover:opacity-100 sm:p-2"
            @click="beginPatchEditing"
          >
            <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
            <span class="codicon codicon-edit"></span>
          </vscode-button>
        </div>
        <Markdown
          v-if="firstRevision.description"
          :source="firstRevision.description"
          class="text-sm"
        />
      </div>
      <form
        v-if="patchEditForm.status === 'editing' || patchEditForm.status === 'previewing'"
        @submit.prevent
        ref="formEl"
        name="Edit patch title and description"
        class="pb-2 flex flex-col gap-y-3 outline-none"
      >
        <div
          v-if="patchEditForm.status === 'previewing'"
          :class="[
            'max-w-fit flex flex-col gap-y-4 group',
            { 'preview-container': patchEditForm.status === 'previewing' },
          ]"
        >
          <h1 class="my-0 text-3xl font-mono"><Markdown :source="patchEditForm.title" /></h1>
          <Markdown v-if="patchEditForm.descr" :source="patchEditForm.descr" class="text-sm" />
        </div>

        <vscode-text-area
          v-show="patchEditForm.status === 'editing'"
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
          v-show="patchEditForm.status === 'editing'"
          ref="descrTextAreaEl"
          :value="patchEditForm.descr"
          @input="(ev: VscodeTextAreaEvent) => (patchEditForm.descr = ev.target._value)"
          placeholder="Describe the patch in more detail…"
          name="patch description"
          resize="vertical"
          maxlength="500000"
          >Patch Description:</vscode-text-area
        >

        <div class="w-full flex flex-row-reverse justify-between">
          <div class="flex flex-row-reverse justify-start gap-x-2">
            <vscode-button
              appearance="primary"
              title="Save Changes to Radicle (Ctrl + Enter)"
              @click="submitPatchEditForm"
            >
              <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
              <span slot="start" class="codicon codicon-save"></span>
              Update
            </vscode-button>
            <vscode-button
              appearance="secondary"
              title="Pause Editing, Preserving Current Changes for Later (Escape)"
              @click="pausePatchEditing"
            >
              <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
              <span class="codicon codicon-coffee"></span>
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
          <div class="flex flex-row-reverse justify-start gap-x-2">
            <vscode-button
              class="self-center"
              :appearance="patchEditForm.status === 'previewing' ? 'primary' : 'secondary'"
              :title="
                patchEditForm.status === 'previewing'
                  ? 'Stop Previewing as Rendered Markdown and Return to Editing (Alt + P)'
                  : 'Preview Changes as Rendered Markdown (Alt + P)'
              "
              @click="togglePreviewMarkdown"
            >
              <span
                :class="[
                  'codicon',
                  patchEditForm.status === 'previewing' ? 'codicon-edit' : 'codicon-markdown',
                ]"
              ></span>
            </vscode-button>
          </div>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.preview-container {
  @apply p-1 border border-dashed border-[var(--vscode-focusBorder,var(--vscode-commandCenter-debuggingBackground))];
}

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
