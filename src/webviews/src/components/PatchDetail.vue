<script setup lang="ts">
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeDropdown,
  vsCodeOption,
} from '@vscode/webview-ui-toolkit'
import { ref, computed, toRaw, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import {
  getIdentityAliasOrId,
  shortenHash,
  truncateMarkdown,
  maxCharsForUntruncatedMdText,
  truncateMiddle,
} from 'extensionUtils/string'
import { getFormattedDate, getTimeAgo } from 'extensionUtils/time'
import { notifyExtension } from 'extensionUtils/webview-messaging'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import { scrollToTemplateRef } from '@/utils/scrollToTemplateRef'
import type { Comment, RadicleIdentity, Revision } from '../../../types'
import PatchStatusBadge from '@/components/PatchStatusBadge.vue'
import PatchMajorEvents from '@/components/PatchMajorEvents.vue'
import PatchMetadata from '@/components/PatchMetadata.vue'
import Markdown from '@/components/Markdown.vue'
import Metadatum from '@/components/Metadatum.vue'
import EventList from '@/components/EventList.vue'
import EventItem from '@/components/EventItem.vue'

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeDropdown(), vsCodeOption())

const { patch, authors, firstRevision, latestRevision, localIdentity, identities } =
  storeToRefs(usePatchDetailStore())

const revisionSelectorRef = ref<HTMLElement>()
const revisionOptionsMap = computed(
  () =>
    new Map(
      [...patch.value.revisions]
        .reverse()
        .map((revision) => [assembleRevisionOptionLabel(revision), revision]),
    ),
)
// TODO: maninak if patch is merged pre-select revision that got merged
const selectedRevisionOption = ref(assembleRevisionOptionLabel(latestRevision.value))
const selectedRevision = computed(
  () =>
    revisionOptionsMap.value.get(selectedRevisionOption.value) as NonNullable<
      ReturnType<(typeof revisionOptionsMap)['value']['get']>
    >,
)

function selectAndScrollToRevision(revision: Revision) {
  selectedRevisionOption.value = assembleRevisionOptionLabel(revision)
  scrollToTemplateRef(revisionSelectorRef.value, {
    classToAdd: 'pulse-outline',
    removeAfterMs: 1500,
  })
}

function getRevisionHoverTitle(text: string) {
  return `Click to show Revision details.\n\nRevision description:\n"${text}"`
}

const commentRefs = ref<InstanceType<typeof EventItem>[]>()
function scrollToComment(commentId: Comment['id']) {
  const foundCommentRef = commentRefs.value?.find(
    (commentEl) => commentEl.$attrs.id === commentId,
  )

  scrollToTemplateRef(foundCommentRef, { classToAdd: 'pulse-outline', removeAfterMs: 1500 })
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

const shouldHideRevisionDescription = computed(
  () =>
    selectedRevision.value.description && selectedRevision.value.id === firstRevision.value.id,
)
const selectedRevisionAcceptedReviews = computed(() =>
  selectedRevision.value.reviews.filter((review) => review.verdict === 'accept'),
)
const selectedRevisionRejectedReviews = computed(() =>
  selectedRevision.value.reviews.filter((review) => review.verdict === 'reject'),
)

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

// TODO: delete resolveRadicleIdentity when httpd returns a full RadicleIdentity for reactions
// When doing so, also delete:
//  - `localIdentity` from `PatchDetailInjectedState`
//  - `identities` from `patchDetailStore`
function resolveRadicleIdentity(id: string): RadicleIdentity | undefined {
  return identities.value.find((identity) => identity.id.includes(id))
}

function refetchPatchData() {
  notifyExtension({ command: 'refreshPatchData', payload: { patchId: patch.value.id } })
}

function checkOutPatchBranch() {
  notifyExtension({ command: 'checkOutPatchBranch', payload: { patch: toRaw(patch.value) } })
}

function checkOutDefaultBranch() {
  notifyExtension({ command: 'checkOutDefaultBranch', payload: undefined })
}

function revealPatch() {
  notifyExtension({ command: 'revealInPatchesView', payload: { patch: toRaw(patch.value) } })
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
</script>

<template>
  <article class="flex flex-col gap-12">
    <!-- TODO: maninak make h2s (and maybe also header?) sticky -->
    <header class="flex gap-4 justify-between">
      <div class="flex flex-wrap gap-4 items-center">
        <PatchStatusBadge class="text-sm" />
        <PatchMajorEvents />
      </div>
      <aside class="flex flex-col gap-2 *:w-full">
        <vscode-button
          class="self-center"
          appearance="secondary"
          title="Refresh all data rendered on this page"
          @click="refetchPatchData"
        >
          <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
          <span slot="start" class="codicon codicon-refresh"></span>Refresh</vscode-button
        >
        <vscode-button
          v-if="!patch.isCheckedOut"
          class="self-center"
          appearance="secondary"
          title="Check out the Git branch associated with this Radicle patch"
          @click="checkOutPatchBranch"
        >
          <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
          <span slot="start" class="codicon codicon-check"></span>Check Out</vscode-button
        >
        <vscode-button
          v-else
          class="self-center"
          appearance="secondary"
          title="Switch from the Git branch associated with this patch to the project's default branch"
          @click="checkOutDefaultBranch"
        >
          <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
          <span slot="start" class="codicon codicon-home"></span>Check Out
          Default</vscode-button
        >
        <vscode-button
          class="self-center"
          appearance="secondary"
          title="Reveal In Patches View"
          @click="revealPatch"
        >
          <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
          <span slot="start" class="codicon codicon-export"></span>Reveal</vscode-button
        >
      </aside>
    </header>
    <main class="flex flex-col gap-12">
      <section>
        <h2 class="text-lg mt-0 mb-3">#&nbsp;Patch</h2>
        <PatchMetadata />
        <h1 class="my-4 text-3xl font-mono"><Markdown :source="patch.title" /></h1>
        <Markdown :source="firstRevision.description" class="text-sm" />
      </section>

      <section>
        <h2
          class="max-w-max flex items-center gap-[0.5em] text-lg mt-0 flex-wrap mb-3"
          title="Select a patch revision"
        >
          <label for="revision-selector" class="cursor-pointer">#&nbsp;Revision</label>
          <vscode-dropdown
            id="revision-selector"
            ref="revisionSelectorRef"
            v-model="selectedRevisionOption"
            class="font-mono rounded-none"
          >
            <vscode-option
              v-for="revisionOption in revisionOptionsMap.keys()"
              :key="revisionOption"
              class="font-mono"
              >{{ revisionOption }}</vscode-option
            >
          </vscode-dropdown>
        </h2>
        <Metadatum label="Id">
          <pre :title="selectedRevision.id">{{ shortenHash(selectedRevision.id) }}</pre>
          <template #aside>
            <vscode-button
              appearance="icon"
              title="Copy Revision Identifier to Clipboard"
              @click="
                notifyExtension({
                  command: 'copyToClipboardAndNotify',
                  payload: { textToCopy: selectedRevision.id },
                })
              "
            >
              <span class="codicon codicon-copy"></span>
            </vscode-button>
          </template>
        </Metadatum>
        <Metadatum label="Author">
          <pre :title="selectedRevision.author.id">{{
            getIdentityAliasOrId(selectedRevision.author)
          }}</pre>
        </Metadatum>
        <Metadatum
          v-if="
            selectedRevisionAcceptedReviews.length || selectedRevisionRejectedReviews.length
          "
          label="Reviews"
        >
          <span class="flex items-center gap-[1em]">
            <span
              v-if="selectedRevisionAcceptedReviews.length"
              class="flex items-start gap-x-[0.5em]"
            >
              <span class="codicon codicon-thumbsup" title="Accepted revision"></span>
              <span v-for="review in selectedRevisionAcceptedReviews" :key="review.timestamp">
                <pre :title="selectedRevision.author.id">{{
                  getIdentityAliasOrId(selectedRevision.author)
                }}</pre>
              </span>
            </span>
            <span
              v-if="selectedRevisionRejectedReviews.length"
              class="flex items-start gap-x-[0.5em]"
            >
              <span class="codicon codicon-thumbsdown" title="Rejected revision"></span>
              <span v-for="review in selectedRevisionRejectedReviews" :key="review.timestamp">
                <pre :title="selectedRevision.author.id">{{
                  getIdentityAliasOrId(selectedRevision.author)
                }}</pre>
              </span>
            </span>
          </span>
        </Metadatum>
        <Metadatum label="Date">
          <span
            :title="new Date(selectedRevision.timestamp * 1000).toISOString()"
            class="font-mono"
            >{{ getFormattedDate(selectedRevision.timestamp) }}</span
          >
        </Metadatum>
        <Metadatum label="Latest commit">
          <pre :title="selectedRevision.oid">{{ shortenHash(selectedRevision.oid) }}</pre>
        </Metadatum>
        <Metadatum label="Based on commit">
          <pre :title="selectedRevision.base">{{ shortenHash(selectedRevision.base) }}</pre>
        </Metadatum>
        <div v-if="selectedRevision.description" class="mt-4">
          <details v-if="shouldHideRevisionDescription">
            <summary style="color: var(--vscode-foreground)" title="Click to expand/collapse"
              >Description</summary
            >
            <Markdown :source="selectedRevision.description" class="mt-[0.25em] text-sm" />
          </details>
          <Markdown v-else :source="selectedRevision.description" class="text-sm" />
        </div>
      </section>

      <section>
        <!-- TODO: add button to expand/collapse all -->
        <h2 class="text-lg mt-0 mb-3">#&nbsp;Activity</h2>
        <EventList>
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
                @click="selectAndScrollToRevision(event.revision)"
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
                @click="selectAndScrollToRevision(event.revision)"
                :title="getRevisionHoverTitle(event.revision.description)"
                class="font-mono hover:cursor-pointer"
                >{{ shortenHash(event.revision.id) }}</span
              >
              posted
              <span v-if="event.review.inline?.length">with code-inlined comments</span>
              by
              <span :title="event.revision.author.id" class="font-mono">{{
                getIdentityAliasOrId(event.revision.author)
              }}</span>
              <template v-if="event.review.summary">
                <details v-if="event.review.summary && event.review.comment">
                  <summary
                    style="color: var(--vscode-foreground)"
                    title="Click to expand/collapse"
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
                @click="selectAndScrollToRevision(event.revision)"
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
                  title="Click to show parent comment"
                  class="font-mono hover:cursor-pointer"
                  >another</span
                ></span
              >
              <details
                v-if="event.discussion.body.length > maxCharsForUntruncatedMdText"
                class="[&_summary]:open:opacity-50"
              >
                <summary
                  style="color: var(--vscode-foreground)"
                  title="Click to expand/collapse"
                  class="mt-1 max-w-prose text-sm font-mono"
                  >{{ truncateMarkdown(event.discussion.body) }}</summary
                >
                <Markdown :source="event.discussion.body" class="mt-[0.25em] text-sm" />
              </details>
              <Markdown v-else :source="event.discussion.body" class="mt-[0.25em] text-sm" />
              <div
                v-if="event.discussion.reactions.length"
                class="mt-[0.25em] flex flex-wrap gap-x-3"
              >
                <span
                  v-for="reaction in event.discussion.reactions"
                  :key="reaction.emoji"
                  :title="`Reaction from ${new Intl.ListFormat('en', {
                    style: 'long',
                    type: 'conjunction',
                  }).format(
                    reaction.authors.map(
                      (author) => resolveRadicleIdentity(author)?.alias ?? author,
                    ),
                  )}`"
                  :class="{
                    'modified-by-local-identity': reaction.authors.find((author) =>
                      localIdentity?.id.includes(author),
                    ),
                  }"
                >
                  <template
                    v-if="
                      event.discussion.reactions.flatMap((reaction) => reaction.authors)
                        .length <= 4
                    "
                  >
                    {{ reaction.emoji }}
                    <template
                      v-for="(part, index) in new Intl.ListFormat('en', {
                        style: 'short',
                        type: 'unit',
                      }).formatToParts(
                        reaction.authors.map(
                          (author) =>
                            resolveRadicleIdentity(author)?.alias ?? truncateMiddle(author),
                        ),
                      )"
                      :key="index"
                    >
                      <span v-if="part.type === 'element'" class="font-mono">{{
                        part.value
                      }}</span>
                      <template v-else-if="part.type === 'literal'">{{ part.value }}</template>
                    </template>
                  </template>
                  <template v-else>
                    {{ reaction.emoji }}
                    <span class="font-mono">{{ reaction.authors.length }}</span>
                  </template>
                </span>
              </div>
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
                @click="selectAndScrollToRevision(event.revision)"
                :title="getRevisionHoverTitle(event.revision.description)"
                class="font-mono hover:cursor-pointer"
                >{{ shortenHash(event.revision.id) }}</span
              >
              <span v-else class="font-mono">{{ shortenHash(event.merge.revision) }}</span>
            </EventItem>
          </template>
        </EventList>
      </section>
    </main>
  </article>
</template>

<style scoped>
.modified-by-local-identity {
  @apply outline outline-1 outline-offset-1;
  background-color: color-mix(in srgb, var(--vscode-editor-foreground) 7%, transparent);
  outline-color: color-mix(in srgb, var(--vscode-editor-foreground) 20%, transparent);
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
  animation: outline-pulse 1.5s ease-in-out forwards;
}
</style>
