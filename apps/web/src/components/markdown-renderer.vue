<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/shared/markdown'

const props = withDefaults(defineProps<{
  source?: string | null
  inline?: boolean
  compact?: boolean
  emptyText?: string
}>(), {
  source: '',
  inline: false,
  compact: false,
  emptyText: '',
})

const html = computed(() => renderMarkdown(props.source?.trim() || props.emptyText))
</script>

<template>
  <div
    class="markdown-renderer"
    :class="{
      'markdown-renderer--inline': inline,
      'markdown-renderer--compact': compact,
    }"
    v-html="html"
  />
</template>

<style>
.markdown-renderer {
  min-width: 0;
  color: inherit;
  overflow-wrap: anywhere;
}

.markdown-renderer > :first-child {
  margin-top: 0;
}

.markdown-renderer > :last-child {
  margin-bottom: 0;
}

.markdown-renderer p,
.markdown-renderer ul,
.markdown-renderer ol,
.markdown-renderer blockquote,
.markdown-renderer pre,
.markdown-renderer .markdown-table-wrap {
  margin: 0 0 12px;
}

.markdown-renderer h1,
.markdown-renderer h2,
.markdown-renderer h3,
.markdown-renderer h4,
.markdown-renderer h5,
.markdown-renderer h6 {
  margin: 18px 0 10px;
  color: var(--pc-text);
  line-height: 1.3;
  font-weight: 650;
}

.markdown-renderer h1 {
  font-size: 1.65em;
}

.markdown-renderer h2 {
  padding-bottom: 6px;
  border-bottom: 1px solid var(--pc-border-soft);
  font-size: 1.4em;
}

.markdown-renderer h3 {
  font-size: 1.2em;
}

.markdown-renderer h4,
.markdown-renderer h5,
.markdown-renderer h6 {
  font-size: 1em;
}

.markdown-renderer ul,
.markdown-renderer ol {
  padding-left: 1.6em;
}

.markdown-renderer li + li {
  margin-top: 4px;
}

.markdown-renderer .task-list-item {
  list-style: none;
}

.markdown-renderer .task-list-item input {
  margin: 0 7px 0 -1.4em;
}

.markdown-renderer blockquote {
  padding: 2px 0 2px 12px;
  border-left: 3px solid var(--pc-border);
  color: var(--pc-text-secondary);
}

.markdown-renderer blockquote > :last-child {
  margin-bottom: 0;
}

.markdown-renderer code {
  border-radius: 3px;
  background: color-mix(in srgb, var(--pc-text) 8%, transparent);
  padding: 0.15em 0.35em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
}

.markdown-renderer pre {
  max-height: 420px;
  overflow: auto;
  border-radius: var(--pc-radius-sm);
  background: #171719;
  padding: 12px;
  color: #f5f5f7;
}

.markdown-renderer pre code {
  background: transparent;
  padding: 0;
  color: inherit;
  white-space: pre-wrap;
}

.markdown-renderer a {
  color: var(--pc-action);
  text-decoration: none;
}

.markdown-renderer a:hover {
  text-decoration: underline;
}

.markdown-renderer img {
  display: block;
  max-width: min(100%, 760px);
  max-height: 520px;
  margin: 8px 0;
  border: 1px solid var(--pc-border-soft);
  border-radius: var(--pc-radius-sm);
  object-fit: contain;
}

.markdown-renderer hr {
  margin: 18px 0;
  border: 0;
  border-top: 1px solid var(--pc-border);
}

.markdown-renderer .markdown-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.markdown-renderer table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
}

.markdown-renderer th,
.markdown-renderer td {
  border: 1px solid var(--pc-border);
  padding: 7px 10px;
  text-align: left;
}

.markdown-renderer th {
  background: var(--pc-surface-soft);
  color: var(--pc-text);
  font-weight: 600;
}

.markdown-renderer--compact {
  font-size: 13px;
  line-height: 1.5;
}

.markdown-renderer--compact p,
.markdown-renderer--compact ul,
.markdown-renderer--compact ol,
.markdown-renderer--compact blockquote,
.markdown-renderer--compact pre,
.markdown-renderer--compact .markdown-table-wrap {
  margin-bottom: 6px;
}

.markdown-renderer--inline {
  display: block;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.markdown-renderer--inline > * {
  display: inline;
  margin: 0;
  padding: 0;
  border: 0;
}

.markdown-renderer--inline br {
  display: none;
}

.markdown-renderer--inline li {
  display: inline;
}

.markdown-renderer--inline li + li::before {
  content: " · ";
}

.markdown-renderer--inline img {
  display: inline-block;
  width: auto;
  height: 1.2em;
  margin: 0 3px;
  vertical-align: -0.2em;
}
</style>
