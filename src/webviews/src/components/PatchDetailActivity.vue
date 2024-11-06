<script setup lang="ts">
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeTextArea,
} from '@vscode/webview-ui-toolkit'
import { ref, computed, toRaw, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useEventListener } from '@vueuse/core'
import {
  getIdentityAliasOrId,
  shortenHash,
  truncateMarkdown,
  maxCharsForUntruncatedMdText,
} from 'extensionUtils/string'
import type { Comment, Revision } from '../../../types'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import { scrollToTemplateRef } from '@/utils/scrollToTemplateRef'
import Markdown from '@/components/Markdown.vue'
import EventList from '@/components/EventList.vue'
import EventItem from '@/components/EventItem.vue'
import Reactions from '@/components/Reactions.vue'
import { notifyExtension } from 'extensionUtils/webview-messaging'

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextArea())

defineProps<{ showHeading: boolean }>()

const emit = defineEmits<{ showRevision: [revision: Revision] }>()

const { patch, firstRevision, patchCommentForm } = storeToRefs(usePatchDetailStore())

function getRevisionHoverTitle(text: string) {
  return `Click to See Revision Details\n⸻\nRevision Description:\n"${text}"`
}

const commentRefs = ref<InstanceType<typeof EventItem>[]>()
function scrollToComment(commentId: Comment['id']) {
  const foundCommentRef = commentRefs.value?.find(
    (commentEl) => commentEl.$attrs.id === commentId,
  )

  scrollToTemplateRef(foundCommentRef, { classToAdd: 'pulse-outline', removeAfterMs: 1500 })
}

const patchEvents = computed(() =>
  [
    patch.value.revisions.map(
      (revision) => ({ kind: 'revision', ts: revision.timestamp, revision }) as const,
    ),
    patch.value.revisions.flatMap((revision) =>
      revision.reviews.map(
        (review) => ({ kind: 'review', ts: review.timestamp, review, revision }) as const,
      ),
    ),
    patch.value.revisions.flatMap((revision) =>
      revision.discussions.map(
        (discussion) =>
          ({ kind: 'discussion', ts: discussion.timestamp, discussion, revision }) as const,
      ),
    ),
    patch.value.merges.map(
      (merge) =>
        ({
          kind: 'merge',
          ts: merge.timestamp,
          merge,
          revision: patch.value.revisions.find((revision) => revision.id === merge.revision),
        }) as const,
    ),
  ]
    .flat()
    .sort((ev1, ev2) => ev2.ts - ev1.ts),
)

// TODO: maninak extract to usePatchCommentForm? composable

interface VscodeTextAreaEvent {
  target: { _value: string }
}
const formEl = ref<HTMLElement>()
const commentTextAreaEl = ref<HTMLElement>()

watchEffect(() => {
  const commentEl = commentTextAreaEl.value?.shadowRoot?.querySelector('textarea')
  const els = [commentEl].filter(Boolean)

  els.forEach((el) => {
    useEventListener(
      el,
      'keydown',
      (ev) => {
        if (ev.key === 'Escape') {
          patchCommentForm.value.isEditing = false
        }
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
          submitPatchCommentForm()
        }
      },
      { passive: true },
    )
    useEventListener(el, 'focus', alignViewportWithForm, { passive: true })
    useEventListener(el, 'input', alignViewportWithForm, { passive: true })
  })
})

function alignViewportWithForm() {
  formEl.value?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
}

watchEffect(() => {
  if (patchCommentForm.value.isEditing) {
    setTimeout(() => {
      commentTextAreaEl.value?.focus()
    }, 0) // Vue.nextTick isn't cutting it
  }
})

function submitPatchCommentForm() {
  patchCommentForm.value.isEditing = false
  notifyExtension({
    command: 'createPatchComment',
    payload: {
      patch: toRaw(patch.value),
      revisionId: patch.value.id, // TODO: maninak use the selectedRevision from global store (migrated there from PatchDetail.vue)
      comment: patchCommentForm.value.comment.trim(),
    },
  })
}

function discardPatchCommentForm() {
  patchCommentForm.value.isEditing = false
  patchCommentForm.value.comment = ''
}
</script>

<template>
  <section>
    <!-- TODO: add button to expand/collapse all -->
    <h2 v-if="showHeading" class="text-lg font-normal mt-0 mb-4">Activity</h2>
    <EventList>
      <EventItem v-if="patchCommentForm.isEditing" :when="NaN" codicon="codicon-comment">
        <form
          @submit.prevent
          ref="formEl"
          name="Edit patch title and description"
          class="pb-2 flex flex-col gap-y-3"
        >
          <vscode-text-area
            ref="commentTextAreaEl"
            :value="patchCommentForm.comment"
            @input="(ev: VscodeTextAreaEvent) => (patchCommentForm.comment = ev.target._value)"
            placeholder="Share your kind thoughts…"
            name="patch comment"
            resize="vertical"
            maxlength="50000"
          >
            New Patch Comment:
          </vscode-text-area>
          <div class="w-full flex flex-row-reverse justify-start gap-x-2">
            <vscode-button
              appearance="primary"
              title="Save New Comment to Radicle"
              @click="submitPatchCommentForm"
            >
              Comment
            </vscode-button>
            <vscode-button
              appearance="secondary"
              title="Stop Editing and Discard Current Changes"
              @click="discardPatchCommentForm"
            >
              Discard
            </vscode-button>
          </div>
        </form>
      </EventItem>
      <!-- TODO: list committer's email as tooltip -->
      <!--<div class="grid grid-cols-subgrid gap-x-3 items-center">
        <span
          title="Git commit"
          class="px-[2px] no-underline before:bg-vscode-editor-background codicon codicon-git-commit"
        ></span>
        <div class="flex items-center">
          <pre>Add embeds also to revisions</pre>
          <vscode-button
            class="ml-1"
            appearance="icon"
            title="Show/hide additional commit info"
          >
            <span class="codicon codicon-ellipsis"></span>
          </vscode-button>
        </div>
        <pre title="aed8538aed8538aed8538">aed8538</pre>
        &ndash;
        <pre title="me@sebastinez.dev">Sebastian Martinez</pre>
        <pre>10 hours ago</pre>
      </div> -->
      <template v-for="event in patchEvents" :key="event.ts">
        <EventItem
          v-if="event.kind === 'revision'"
          :when="event.ts"
          codicon="codicon-versions"
        >
          {{ event.revision.id === firstRevision.id ? 'Patch and revision' : 'Revision' }}
          <span
            @click="emit('showRevision', event.revision)"
            :title="getRevisionHoverTitle(event.revision.description)"
            class="font-mono hover:cursor-pointer"
            >{{ shortenHash(event.revision.id) }}</span
          >
          created by
          <span :title="event.revision.author.id" class="font-mono">{{
            getIdentityAliasOrId(event.revision.author)
          }}</span>
        </EventItem>
        <EventItem
          v-else-if="event.kind === 'review'"
          :when="event.ts"
          :codicon="
            event.review.verdict === 'accept'
              ? 'codicon-thumbsup'
              : event.review.verdict === 'reject'
                ? 'codicon-thumbsdown'
                : 'codicon-feedback'
          "
        >
          Review
          <span v-if="event.review.verdict" class="font-mono">
            {{ `${event.review.verdict}ing` }}
          </span>
          <template v-else>with <span class="font-mono">no verdict</span> for</template>
          revision
          <span
            @click="emit('showRevision', event.revision)"
            :title="getRevisionHoverTitle(event.revision.description)"
            class="font-mono hover:cursor-pointer"
            >{{ shortenHash(event.revision.id) }}</span
          >
          posted
          <span v-if="event.review.inline?.length">with code-inlined comments</span>
          by
          <span :title="event.revision.author.id" class="font-mono">{{
            getIdentityAliasOrId(event.review.author)
          }}</span>
          <template v-if="event.review.summary">
            <details v-if="event.review.summary && event.review.comment">
              <summary
                title="Click to Expand/Collapse"
                class="mt-1 max-w-prose break-words text-sm font-mono"
                >{{ event.review.summary }}</summary
              >
              <Markdown :source="event.review.comment" class="mt-[0.25em] text-sm" />
            </details>
            <p
              v-else-if="event.review.summary && !event.review.comment"
              class="mt-1 -mb-[0.2em] max-w-prose break-words text-sm font-mono"
              >{{ event.review.summary }}</p
            >
          </template>
        </EventItem>
        <EventItem
          v-else-if="event.kind === 'discussion'"
          ref="commentRefs"
          :id="event.discussion.id"
          :when="event.ts"
          :codicon="
            event.discussion.resolved ? 'codicon-comment' : 'codicon-comment-unresolved'
          "
        >
          Comment
          <span v-if="!event.discussion.resolved"
            >(<span class="font-mono">unresolved</span>)</span
          >
          posted on revision
          <span
            @click="emit('showRevision', event.revision)"
            :title="getRevisionHoverTitle(event.revision.description)"
            class="font-mono hover:cursor-pointer"
            >{{ shortenHash(event.revision.id) }}</span
          >
          by
          <span :title="event.discussion.author.id" class="font-mono">{{
            getIdentityAliasOrId(event.discussion.author)
          }}</span>
          <span v-if="event.discussion.replyTo">
            in reply to
            <span
              @click="scrollToComment(event.discussion.replyTo)"
              title="Click to Show Parent Comment"
              class="font-mono hover:cursor-pointer"
              >another</span
            ></span
          >
          <details v-if="event.discussion.body.length > maxCharsForUntruncatedMdText">
            <summary
              title="Click to Expand/Collapse"
              class="mt-1 max-w-prose text-sm font-mono"
              >{{ truncateMarkdown(event.discussion.body) }}</summary
            >
            <Markdown :source="event.discussion.body" class="mt-[0.25em] text-sm" />
          </details>
          <Markdown v-else :source="event.discussion.body" class="mt-[0.25em] text-sm" />
          <Reactions
            v-if="event.discussion.reactions.length"
            :reactions="event.discussion.reactions"
            class="mt-[0.25em]"
          />
        </EventItem>
        <EventItem
          v-else-if="event.kind === 'merge'"
          :when="event.ts"
          codicon="codicon-git-merge"
        >
          Patch merged by
          <span :title="event.merge.author.id" class="font-mono">{{
            getIdentityAliasOrId(event.merge.author)
          }}</span>
          using revision
          <span
            v-if="event.revision"
            @click="emit('showRevision', event.revision)"
            :title="getRevisionHoverTitle(event.revision.description)"
            class="font-mono hover:cursor-pointer"
            >{{ shortenHash(event.revision.id) }}</span
          >
          <span v-else class="font-mono">{{ shortenHash(event.merge.revision) }}</span>
        </EventItem>
      </template>
    </EventList>
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

vscode-text-area::part(label) {
  margin-bottom: 0.5em;
}

:deep(.pulse-outline) {
  @keyframes outline-pulse {
    from {
      @apply outline-transparent;
    }
    25% {
      @apply outline-vscode-editor-foreground;
    }
    50% {
      @apply outline-transparent;
    }
    70% {
      @apply outline-vscode-editor-foreground;
    }
    to {
      @apply outline-transparent;
    }
  }

  @apply outline outline-offset-[0.25em];
  animation: outline-pulse 1000ms ease-in-out forwards;
}
</style>
