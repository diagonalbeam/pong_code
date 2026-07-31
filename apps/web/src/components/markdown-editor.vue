<script setup lang="ts">
import { Crepe } from '@milkdown/crepe'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import { replaceAll } from '@milkdown/kit/utils'
import { ElMessage } from 'element-plus'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { uploadMarkdownImages } from '@/api/uploads'
import { apiErrorMessage } from '@/api/client'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  testId?: string
  minHeight?: number
  maxLength?: number
  required?: boolean
  monospace?: boolean
}>(), {
  placeholder: '输入内容，支持 Markdown，可直接粘贴图片',
  testId: undefined,
  minHeight: 180,
  maxLength: undefined,
  required: false,
  monospace: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const host = ref<HTMLDivElement | null>(null)
const ready = ref(false)
const markdownLength = ref(props.modelValue.length)

let crepe: Crepe | undefined
let acceptedMarkdown = props.modelValue
let applyingExternalValue = false
let disposed = false
let revertingLengthOverflow = false

function editorElement() {
  return host.value?.querySelector<HTMLElement>('.ProseMirror')
}

function syncEditorAttributes() {
  const editor = editorElement()
  if (!editor)
    return

  if (props.testId)
    editor.dataset.testid = props.testId
  else
    delete editor.dataset.testid

  editor.setAttribute('aria-label', props.placeholder)
  editor.setAttribute('aria-required', String(props.required))
}

async function uploadImage(file: File) {
  try {
    const [url] = await uploadMarkdownImages([file])
    if (!url)
      throw new Error('图片上传接口未返回地址')
    ElMessage.success('图片上传成功')
    return url
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '图片上传失败'))
    throw error
  }
}

function restoreAcceptedMarkdown() {
  if (!crepe || !ready.value)
    return

  applyingExternalValue = true
  crepe.editor.action(replaceAll(acceptedMarkdown))
  applyingExternalValue = false
  markdownLength.value = acceptedMarkdown.length
}

function handleMarkdownUpdate(markdown: string) {
  if (applyingExternalValue)
    return

  if (props.maxLength && markdown.length > props.maxLength) {
    if (!revertingLengthOverflow) {
      revertingLengthOverflow = true
      ElMessage.warning(`最多输入 ${props.maxLength} 个字符`)
      queueMicrotask(() => {
        restoreAcceptedMarkdown()
        revertingLengthOverflow = false
      })
    }
    return
  }

  acceptedMarkdown = markdown
  markdownLength.value = markdown.length
  emit('update:modelValue', markdown)
}

onMounted(async () => {
  if (!host.value)
    return

  crepe = new Crepe({
    root: host.value,
    defaultValue: props.modelValue,
    features: {
      [Crepe.Feature.Latex]: false,
      [Crepe.Feature.TopBar]: false,
      [Crepe.Feature.AI]: false,
    },
    featureConfigs: {
      [Crepe.Feature.Placeholder]: {
        text: props.placeholder,
        mode: 'block',
      },
      [Crepe.Feature.ImageBlock]: {
        onUpload: uploadImage,
        inlineConfirmButton: '确认',
        inlineUploadButton: '上传图片',
        inlineUploadPlaceholderText: '或粘贴图片地址',
        blockConfirmButton: '确认',
        blockCaptionPlaceholderText: '图片说明',
        blockUploadButton: '选择图片',
        blockUploadPlaceholderText: '或粘贴图片地址',
      },
      [Crepe.Feature.LinkTooltip]: {
        editButton: '编辑链接',
        removeButton: '移除链接',
        confirmButton: '确认',
        inputPlaceholder: '粘贴链接地址',
      },
      [Crepe.Feature.BlockEdit]: {
        textGroup: {
          label: '文本',
          text: { label: '正文' },
          h1: { label: '一级标题' },
          h2: { label: '二级标题' },
          h3: { label: '三级标题' },
          h4: { label: '四级标题' },
          h5: { label: '五级标题' },
          h6: { label: '六级标题' },
          quote: { label: '引用' },
          divider: { label: '分割线' },
        },
        listGroup: {
          label: '列表',
          bulletList: { label: '无序列表' },
          orderedList: { label: '有序列表' },
          taskList: { label: '任务列表' },
        },
        advancedGroup: {
          label: '高级',
          image: { label: '图片' },
          codeBlock: { label: '代码块' },
          table: { label: '表格' },
          math: null,
        },
      },
      [Crepe.Feature.CodeMirror]: {
        previewToggleText: previewOnly => previewOnly ? '编辑代码' : '预览代码',
      },
    },
  })

  crepe.on(listener => {
    listener.markdownUpdated((_ctx, markdown) => {
      handleMarkdownUpdate(markdown)
    })
  })

  try {
    await crepe.create()
    if (disposed)
      return
    ready.value = true
    syncEditorAttributes()
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, 'Markdown 编辑器加载失败'))
  }
})

onBeforeUnmount(() => {
  disposed = true
  if (crepe)
    void crepe.destroy()
})

watch(() => props.modelValue, (next) => {
  acceptedMarkdown = next
  markdownLength.value = next.length

  if (!crepe || !ready.value || crepe.getMarkdown() === next)
    return

  applyingExternalValue = true
  crepe.editor.action(replaceAll(next))
  applyingExternalValue = false
})

watch(
  () => [props.testId, props.placeholder, props.required] as const,
  () => syncEditorAttributes(),
)
</script>

<template>
  <div
    class="markdown-editor"
    :class="{
      'markdown-editor--loading': !ready,
      'markdown-editor--monospace': monospace,
    }"
    :style="{ '--markdown-editor-min-height': `${minHeight}px` }"
    :aria-busy="!ready"
  >
    <div ref="host" class="markdown-editor__host" />

    <div v-if="!ready" class="markdown-editor__skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>

    <div class="markdown-editor__footer">
      <span>输入 / 插入内容 · 粘贴 Markdown 自动格式化 · 支持粘贴或拖入图片</span>
      <span v-if="maxLength">{{ markdownLength }} / {{ maxLength }}</span>
      <span v-else>保存为 Markdown</span>
    </div>
  </div>
</template>

<style scoped>
.markdown-editor {
  position: relative;
  width: 100%;
  overflow: visible;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-sm);
  background: var(--pc-surface);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.markdown-editor:focus-within {
  border-color: var(--pc-action);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--pc-action) 16%, transparent);
}

.markdown-editor__host {
  min-height: var(--markdown-editor-min-height);
  border-radius: var(--pc-radius-sm) var(--pc-radius-sm) 0 0;
}

.markdown-editor :deep(.milkdown) {
  --crepe-color-background: var(--pc-surface);
  --crepe-color-on-background: var(--pc-text);
  --crepe-color-surface: var(--pc-surface-soft);
  --crepe-color-surface-low: var(--pc-border-soft);
  --crepe-color-on-surface: var(--pc-text);
  --crepe-color-on-surface-variant: var(--pc-text-secondary);
  --crepe-color-outline: var(--pc-border);
  --crepe-color-primary: var(--pc-action);
  --crepe-color-secondary: color-mix(in srgb, var(--pc-action) 14%, var(--pc-surface));
  --crepe-color-on-secondary: var(--pc-text);
  --crepe-color-inverse: var(--pc-text);
  --crepe-color-on-inverse: var(--pc-surface);
  --crepe-color-inline-code: var(--pc-danger);
  --crepe-color-error: var(--pc-danger);
  --crepe-color-hover: var(--pc-surface-soft);
  --crepe-color-selected: color-mix(in srgb, var(--pc-action) 20%, transparent);
  --crepe-color-inline-area: color-mix(in srgb, var(--pc-text) 10%, transparent);
  --crepe-font-title: inherit;
  --crepe-font-default: inherit;
  --crepe-font-code: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  min-height: var(--markdown-editor-min-height);
  border-radius: inherit;
}

.markdown-editor :deep(.milkdown .ProseMirror) {
  min-height: var(--markdown-editor-min-height);
  padding: 13px 15px 18px;
  color: var(--pc-text);
  caret-color: var(--pc-action);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.65;
}

.markdown-editor :deep(.milkdown .ProseMirror p) {
  padding: 2px 0;
  font-size: 14px;
  line-height: 1.65;
}

.markdown-editor :deep(.milkdown .ProseMirror h1),
.markdown-editor :deep(.milkdown .ProseMirror h2),
.markdown-editor :deep(.milkdown .ProseMirror h3),
.markdown-editor :deep(.milkdown .ProseMirror h4),
.markdown-editor :deep(.milkdown .ProseMirror h5),
.markdown-editor :deep(.milkdown .ProseMirror h6) {
  margin-top: 14px;
  color: var(--pc-text);
  font-family: inherit;
  font-weight: 650;
  line-height: 1.35;
}

.markdown-editor :deep(.milkdown .ProseMirror h1) {
  font-size: 24px;
}

.markdown-editor :deep(.milkdown .ProseMirror h2) {
  padding-bottom: 5px;
  border-bottom: 1px solid var(--pc-border-soft);
  font-size: 20px;
}

.markdown-editor :deep(.milkdown .ProseMirror h3) {
  font-size: 17px;
}

.markdown-editor :deep(.milkdown .ProseMirror h4),
.markdown-editor :deep(.milkdown .ProseMirror h5),
.markdown-editor :deep(.milkdown .ProseMirror h6) {
  font-size: 14px;
}

.markdown-editor :deep(.milkdown .ProseMirror pre) {
  overflow: auto;
  background: #171719;
  color: #f5f5f7;
}

.markdown-editor :deep(.milkdown .ProseMirror img) {
  max-height: 520px;
  border: 1px solid var(--pc-border-soft);
  border-radius: var(--pc-radius-sm);
  object-fit: contain;
}

.markdown-editor--monospace :deep(.milkdown .ProseMirror) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}

.markdown-editor__footer {
  display: flex;
  min-height: 27px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--pc-border-soft);
  padding: 4px 10px;
  color: var(--pc-text-muted);
  font-size: 10px;
}

.markdown-editor__skeleton {
  position: absolute;
  inset: 0 0 27px;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 18px 15px;
  background: var(--pc-surface);
  pointer-events: none;
}

.markdown-editor__skeleton span {
  width: 72%;
  height: 13px;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    var(--pc-surface-soft) 25%,
    color-mix(in srgb, var(--pc-border-soft) 65%, var(--pc-surface)) 50%,
    var(--pc-surface-soft) 75%
  );
  background-size: 200% 100%;
  animation: markdown-editor-shimmer 1.2s linear infinite;
}

.markdown-editor__skeleton span:nth-child(2) {
  width: 92%;
}

.markdown-editor__skeleton span:nth-child(3) {
  width: 54%;
}

@keyframes markdown-editor-shimmer {
  to {
    background-position: -200% 0;
  }
}

@media (max-width: 640px) {
  .markdown-editor__footer span:first-child {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
