<script setup lang="ts">
import { ArrowDown, Search, Setting } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import { getStatusType, type StatusType } from '@/shared/status'

export interface ContextBreadcrumbOption {
  value: number
  label: string
  meta?: string
  status?: string
}

const props = withDefaults(defineProps<{
  contextName: string
  label: string
  modelValue: number | null
  options: ContextBreadcrumbOption[]
  loading?: boolean
  manageLabel: string
  emptyLabel: string
  testId: string
  maxWidth?: number
}>(), {
  loading: false,
  maxWidth: 176,
})

const emit = defineEmits<{
  select: [value: number]
  manage: []
}>()

const search = ref('')
const scrollBodyRef = ref<HTMLElement | null>(null)
const filteredOptions = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  if (!keyword)
    return props.options
  return props.options.filter(option => (
    `${option.label} ${option.meta || ''}`.toLocaleLowerCase().includes(keyword)
  ))
})
const statusColors: Record<StatusType, string> = {
  success: 'var(--el-color-success)',
  warning: 'var(--el-color-warning)',
  danger: 'var(--el-color-danger)',
  info: 'var(--el-color-info)',
}

function getMetaStyle(status?: string) {
  return status
    ? { color: statusColors[getStatusType(status)] }
    : undefined
}

function handleCommand(command: number | string) {
  if (command === 'manage') {
    emit('manage')
    return
  }
  emit('select', Number(command))
}

function handleVisibleChange(visible: boolean) {
  if (!visible)
    search.value = ''
}

/** 隔离菜单内滚轮：中间原生滚动，头尾与边界处阻止带动页面 */
function handleMenuWheel(event: WheelEvent) {
  event.stopPropagation()

  const body = scrollBodyRef.value
  if (!body) {
    event.preventDefault()
    return
  }

  const deltaY = event.deltaY
  if (!deltaY)
    return

  const { scrollTop, scrollHeight, clientHeight } = body
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight)
  const onBody = event.composedPath().includes(body)

  if (!onBody) {
    body.scrollTop = Math.min(maxScrollTop, Math.max(0, scrollTop + deltaY))
    event.preventDefault()
    return
  }

  if (
    maxScrollTop <= 0
    || (deltaY < 0 && scrollTop <= 0)
    || (deltaY > 0 && scrollTop >= maxScrollTop - 1)
  ) {
    event.preventDefault()
  }
}
</script>

<template>
  <el-tooltip :content="label" :disabled="label.length <= 12" placement="bottom" :show-after="180">
    <el-dropdown
      trigger="click"
      :disabled="loading"
      @command="handleCommand"
      @visible-change="handleVisibleChange"
    >
      <button
        type="button"
        :data-testid="testId"
        class="pc-context-trigger flex h-8 min-w-0 cursor-pointer items-center gap-1 rounded-[var(--pc-radius-sm)] border-0 bg-transparent px-1.5 text-sm font-medium text-[var(--pc-text)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-action)] disabled:cursor-wait disabled:text-[var(--pc-text-muted)]"
        :style="{ maxWidth: `${maxWidth}px` }"
        :aria-label="`切换${contextName}：${label}`"
      >
        <span class="truncate">{{ loading ? '加载中…' : label }}</span>
        <el-icon class="shrink-0 text-[11px] text-[var(--pc-text-muted)]"><ArrowDown /></el-icon>
      </button>
      <template #dropdown>
        <el-dropdown-menu
          :data-testid="`${testId}-menu`"
          class="pc-context-menu min-w-[240px] max-w-[min(86vw,320px)]"
          @wheel="handleMenuWheel"
        >
          <div class="pc-context-menu__header px-2 pt-1 pb-2" @click.stop @keydown.stop>
            <el-input
              v-model="search"
              clearable
              size="small"
              :prefix-icon="Search"
              :placeholder="`搜索${contextName}`"
              @click.stop
            />
          </div>
          <div
            ref="scrollBodyRef"
            class="pc-context-menu__body"
            data-testid="context-menu-scroll-body"
          >
            <el-dropdown-item
              v-for="option in filteredOptions"
              :key="option.value"
              :command="option.value"
              :class="{ 'pc-context-menu__item--selected': option.value === modelValue }"
              :aria-current="option.value === modelValue ? 'true' : undefined"
              :data-testid="`${testId}-option-${option.value}`"
            >
              <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
              <small
                v-if="option.meta"
                class="ml-3 shrink-0 text-xs"
                :style="getMetaStyle(option.status)"
              >
                {{ option.meta }}
              </small>
            </el-dropdown-item>
            <div
              v-if="!filteredOptions.length"
              class="px-3 py-2 text-sm text-[var(--pc-text-muted)]"
            >
              {{ search ? '没有匹配结果' : emptyLabel }}
            </div>
          </div>
          <div class="pc-context-menu__footer">
            <el-dropdown-item command="manage">
              <el-icon><Setting /></el-icon>
              {{ manageLabel }}
            </el-dropdown-item>
          </div>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </el-tooltip>
</template>

<style scoped>
:global(.pc-context-menu.el-dropdown-menu) {
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow: hidden;
  padding-top: 4px;
  padding-bottom: 4px;
  overscroll-behavior: contain;
}

:global(.pc-context-menu .pc-context-menu__header),
:global(.pc-context-menu .pc-context-menu__footer) {
  flex-shrink: 0;
  background: var(--el-bg-color-overlay);
}

:global(.pc-context-menu .pc-context-menu__footer) {
  border-top: 1px solid var(--pc-border-soft);
}

:global(.pc-context-menu .pc-context-menu__body) {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
  touch-action: pan-y;
}

:global(.pc-context-menu .pc-context-menu__body::-webkit-scrollbar) {
  display: none;
  width: 0;
  height: 0;
}

:global(.pc-context-menu .el-dropdown-menu__item:focus-visible) {
  outline-offset: -2px;
}

:global(.pc-context-menu .el-dropdown-menu__item.pc-context-menu__item--selected) {
  color: var(--pc-action);
  font-weight: 600;
}
</style>
