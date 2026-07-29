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
        >
          <div class="px-2 pt-1 pb-2" @click.stop @keydown.stop>
            <el-input
              v-model="search"
              clearable
              size="small"
              :prefix-icon="Search"
              :placeholder="`搜索${contextName}`"
              @click.stop
            />
          </div>
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
          <el-dropdown-item divided command="manage">
            <el-icon><Setting /></el-icon>
            {{ manageLabel }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </el-tooltip>
</template>

<style scoped>
:global(.pc-context-menu .el-dropdown-menu__item:focus-visible) {
  outline-offset: -2px;
}

:global(.pc-context-menu .el-dropdown-menu__item.pc-context-menu__item--selected) {
  color: var(--pc-action);
  font-weight: 600;
}
</style>
