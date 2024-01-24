<script setup lang="ts">
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeDropdown,
  vsCodeOption,
} from '@vscode/webview-ui-toolkit'
import { ref, computed, toRaw } from 'vue'
import { storeToRefs } from 'pinia'
import Markdown from 'vue3-markdown-it'
import 'highlight.js/styles/vs2015.css' // TODO: maninak use own style extending this one but using vscode color variables
import { getIdentityAliasOrId, shortenHash } from 'extensionUtils/string'
import { getFormattedDate, getTimeAgo } from 'extensionUtils/time'
import { notifyExtension } from 'extensionUtils/webview-messaging'
import { usePatchDetailStore } from '@/stores/patchDetailStore'
import PatchStatusBadge from './PatchStatusBadge.vue'
import PatchMajorEvents from './PatchMajorEvents.vue'
import PatchMetadata from './PatchMetadata.vue'
import type { Revision } from '../../../types'

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeDropdown(), vsCodeOption())

const { patch, authors, firstRevision, latestRevision } = storeToRefs(usePatchDetailStore())

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

function refetchPatchData() {
  notifyExtension({ command: 'refreshPatchData', payload: { patchId: patch.value.id } })
}

function checkOutPatchBranch() {
  notifyExtension({ command: 'checkOutPatchBranch', payload: { patch: toRaw(patch.value) } })
}

function checkOutDefaultBranch() {
  notifyExtension({ command: 'checkOutDefaultBranch', payload: undefined })
}
</script>

<template>
  <article class="pt-[20px] flex flex-col gap-12">
    <!-- TODO: maninak make h2s (and maybe also header?) sticky -->
    <header class="flex gap-4 justify-between">
      <div class="flex gap-4 items-center">
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
      </aside>
    </header>
    <main class="flex flex-col gap-12">
      <section id="patch">
        <h2 class="text-lg mt-0 mb-3"># Patch</h2>
        <PatchMetadata />
        <!-- TODO: maninak add button to reveal Patch item in Patches view -->
        <h1 class="my-4 text-3xl font-mono">
          <Markdown :source="patch.title" class="parsed-md" />
        </h1>
        <!-- TODO: maninak add control to toggle raw/parsed markdown -->
        <Markdown :source="firstRevision.description" class="parsed-md text-sm" />
      </section>

      <section id="revision">
        <h2
          class="flex flex-row items-center w-max gap-[0.5em] text-lg mt-0 mb-3"
          title="Select a patch revision"
        >
          <label for="revision-selector" class="cursor-pointer"># Revision</label>
          <vscode-dropdown
            id="revision-selector"
            v-model="selectedRevisionOption"
            class="font-mono"
          >
            <vscode-option
              v-for="revisionOption in revisionOptionsMap.keys()"
              :key="revisionOption"
              class="font-mono"
              >{{ revisionOption }}</vscode-option
            >
          </vscode-dropdown>
        </h2>
        <div class="*:min-h-[1.5em]">
          <div class="flex flex-row items-center w-max gap-[0.5em] group">
            Id:
            <pre :title="selectedRevision.id">{{ shortenHash(selectedRevision.id) }}</pre>
            <vscode-button
              class="invisible group-hover:visible"
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
          </div>
          <div class="flex flex-row items-center w-max gap-[0.5em]">
            Author:
            <pre :title="selectedRevision.author.id" class="flex gap-[0.5em] w-max">{{
              getIdentityAliasOrId(selectedRevision.author)
            }}</pre>
          </div>
          <div
            v-if="
              selectedRevisionAcceptedReviews.length || selectedRevisionRejectedReviews.length
            "
            class="flex flex-row items-center w-max gap-[0.5em]"
          >
            Reviews:
            <div
              v-if="selectedRevisionAcceptedReviews.length"
              class="flex flex-row items-center w-max gap-[1em]"
            >
              <div class="flex flex-row items-center w-max gap-[0.5em]">
                <span class="codicon codicon-thumbsup" title="Accepted revision"></span>
                <div
                  v-for="review in selectedRevisionAcceptedReviews"
                  :key="review.timestamp"
                  class="flex flex-row items-center w-max gap-[0.5em]"
                >
                  <pre :title="selectedRevision.author.id" class="flex gap-[0.5em] w-max">{{
                    getIdentityAliasOrId(selectedRevision.author)
                  }}</pre>
                </div>
              </div>
              <div
                v-if="selectedRevisionRejectedReviews.length"
                class="flex flex-row items-center w-max gap-[0.5em]"
              >
                <span class="codicon codicon-thumbsdown" title="Rejected revision"></span>
                <div
                  v-for="review in selectedRevisionRejectedReviews"
                  :key="review.timestamp"
                  class="flex flex-row items-center w-max gap-[0.5em]"
                >
                  <pre :title="selectedRevision.author.id" class="flex gap-[0.5em] w-max">{{
                    getIdentityAliasOrId(selectedRevision.author)
                  }}</pre>
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-row items-center w-max gap-[0.5em]">
            Date:
            <pre>{{ getFormattedDate(selectedRevision.timestamp) }}</pre>
          </div>
          <div class="flex flex-row items-center w-max gap-[0.5em]">
            Latest commit:
            <pre :title="selectedRevision.oid">{{ shortenHash(selectedRevision.oid) }}</pre>
          </div>
          <div class="flex flex-row items-center w-max gap-[0.5em]">
            Based on commit:
            <pre :title="selectedRevision.base">{{ shortenHash(selectedRevision.base) }}</pre>
          </div>
        </div>
        <div v-if="selectedRevision.description" class="mt-4">
          <details v-if="shouldHideRevisionDescription">
            <summary
              style="color: var(--vscode-foreground)"
              title="Click to expand/collapse revision description"
              >Description</summary
            >
            <Markdown
              :source="selectedRevision.description"
              class="parsed-md text-sm mt-[0.25em]"
            />
          </details>
          <Markdown v-else :source="selectedRevision.description" class="parsed-md text-sm" />
        </div>
      </section>

      <section id="activity">
        <h2 class="text-lg mt-0 mb-3"># Activity</h2>
        <ul class="timeline -ml-[24px] flex flex-col gap-4">
          <li class="-ml-4 flex gap-3 list-none items-center">
            <span
              title="Radicle patch revision"
              class="p-[2px] rounded-full no-underline codicon codicon-pulse"
              style="
                background-color: color-mix(
                  in srgb-linear,
                  var(--vscode-editor-background),
                  var(--vscode-editor-foreground) 5%
                );
              "
            ></span>
            <span>
              Patch created with revision <pre>cdba53e</pre> by
              <pre>danielkalman 21 hours ago</pre>
            </span>
          </li>
          <li class="-ml-4 flex gap-3 list-none items-center">
            <span
              title="Radicle patch revision"
              class="p-[2px] rounded-full no-underline codicon codicon-pulse"
              style="
                background-color: color-mix(
                  in srgb-linear,
                  var(--vscode-editor-background),
                  var(--vscode-editor-foreground) 5%
                );
              "
            ></span>
            <span>
              Patch updated with revision <pre>829bee2</pre> by
              <pre>danielkalman 10 hours ago</pre>
            </span>
          </li>
          <!-- TODO: maninak list committers with gravatar if available and email as tooltip -->
          <li class="-ml-4 flex gap-3 list-none">
            <span
              title="Git commit"
              class="px-[2px] no-underline before:bg-vscode-editor-background codicon codicon-git-commit"
            ></span>
            <div class="flex items-center">
              <pre>Add embeds to patch descriptions</pre>
              <vscode-button
                class="ml-1"
                appearance="icon"
                title="Show/hide additional commit info"
              >
                <span class="codicon codicon-ellipsis"></span>
              </vscode-button>
            </div>
            <pre class="ml-4" tile="87afc6287afc6287afc62">87afc62</pre>
            &ndash;
            <pre title="me@dnlklmn.dev">dnlklmn</pre>
            <pre title=""></pre> <pre>28 hours ago</pre>
          </li>
          <li class="-ml-4 flex gap-3 list-none">
            <span
              title="Git commit"
              class="px-[2px] no-underline before:bg-vscode-editor-background codicon codicon-git-commit"
            ></span>
            <div class="flex items-center">
              <pre>Add <code>--no-announce</code> to patch comment creation for stdout</pre>
              <vscode-button
                class="ml-1"
                appearance="icon"
                title="Show/hide additional commit info"
              >
                <span class="codicon codicon-ellipsis"></span>
              </vscode-button>
            </div>
            <pre class="ml-4" title="cc08490cc08490cc08490">cc08490</pre>
            &ndash;
            <pre title="me@sebastinez.dev">Sebastian Martinez</pre>
            <pre title=""></pre> <pre>11 hours ago</pre>
          </li>
          <li class="-ml-4 flex gap-3 items-center list-none">
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
            <pre class="ml-4" title="aed8538aed8538aed8538">aed8538</pre>
            &ndash;
            <pre title="me@sebastinez.dev">Sebastian Martinez</pre>
            <pre>10 hours ago</pre>
          </li>
        </ul>
      </section>
    </main>
  </article>
</template>

<style scoped>
.timeline {
  position: relative;

  &:before {
    content: '';
    position: absolute;
    z-index: -1;
    left: 33.4px;
    height: 100%;
    width: 1.2px;
    background-color: color-mix(
      in srgb-linear,
      var(--vscode-editor-background),
      var(--vscode-editor-foreground) 5%
    );
  }
}
</style>
