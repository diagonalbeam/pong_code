<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'
import type { Requirement } from '@/api/types'

const props = withDefaults(defineProps<{
  modelValue: number[]
  requirements: Requirement[]
  sprintId: number
  listTestid?: string
  showSearch?: boolean
}>(), {
  showSearch: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const requirementStatusLabels: Record<string, string> = {
  pending: '等待排期',
  in_progress: '进行中',
  testing: '等待测试',
  completed: '已完成',
}

const search = ref('')
const statusFilter = ref('pending')

const statusOptions = [
  { value: '', label: '全部状态' },
  ...Object.entries(requirementStatusLabels).map(([value, label]) => ({ value, label })),
]

const visibleRequirements = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  return props.requirements.filter((item) => {
    const matchesKeyword = !keyword
      || item.title.toLocaleLowerCase().includes(keyword)
      || item.content.toLocaleLowerCase().includes(keyword)
    const matchesStatus = !statusFilter.value || item.status === statusFilter.value
    return matchesKeyword && matchesStatus
  })
})

const visibleSelectedCount = computed(() => {
  const visibleIds = new Set(visibleRequirements.value.map(item => item.id))
  return props.modelValue.filter(id => visibleIds.has(id)).length
})

watch(
  () => [props.sprintId, props.requirements] as const,
  () => {
    search.value = ''
    statusFilter.value = 'pending'
  },
)

function isOccupied(item: Requirement) {
  return item.sprint_id !== null && item.sprint_id !== props.sprintId
}

function bindingLabel(item: Requirement) {
  if (item.sprint_id === props.sprintId)
    return '已绑定当前迭代'
  if (isOccupied(item))
    return `已被“${item.sprint_name || '其他迭代'}”绑定`
  return '未绑定迭代'
}

function statusLabel(status: string) {
  return requirementStatusLabels[status] || status
}

/** 与设计稿一致：进行中蓝、等待橙、完成绿 */
function statusColor(status: string) {
  if (status === 'completed')
    return 'var(--pc-success)'
  if (status === 'in_progress')
    return 'var(--pc-action)'
  if (status === 'pending' || status === 'testing')
    return 'var(--pc-warning)'
  return 'var(--pc-text-muted)'
}
</script>

<template>
  <div class="requirement-bind-list">
    <div class="requirement-bind-list__toolbar">
      <span class="requirement-bind-list__count" data-testid="requirement-bind-selected-count">
        已选 {{ visibleSelectedCount }} 个
      </span>
      <div class="requirement-bind-list__filters">
        <el-select
          v-model="statusFilter"
          class="requirement-bind-list__status"
          data-testid="requirement-bind-status-filter"
        >
          <el-option
            v-for="option in statusOptions"
            :key="option.value || 'all'"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-input
          v-if="showSearch"
          v-model="search"
          clearable
          placeholder="搜索标题或内容"
          class="requirement-bind-list__search"
          data-testid="requirement-bind-search"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
      </div>
    </div>

    <el-checkbox-group
      v-if="visibleRequirements.length"
      :model-value="modelValue"
      class="requirement-bind-list__items"
      :data-testid="listTestid"
      data-requirement-list
      @update:model-value="emit('update:modelValue', $event as number[])"
    >
      <el-checkbox
        v-for="item in visibleRequirements"
        :key="item.id"
        :value="item.id"
        :disabled="isOccupied(item)"
        class="requirement-row"
      >
        <span class="requirement-row__body">
          <strong class="requirement-row__title">{{ item.title }}</strong>
          <span class="requirement-row__status" :style="{ color: statusColor(item.status) }">
            <i class="requirement-row__dot" aria-hidden="true" />
            {{ statusLabel(item.status) }}
          </span>
          <span class="requirement-row__binding">
            <span class="requirement-row__priority">P{{ item.priority }}</span>
            <span class="requirement-row__binding-text">{{ bindingLabel(item) }}</span>
          </span>
        </span>
      </el-checkbox>
    </el-checkbox-group>
    <el-empty
      v-else
      :image-size="72"
      :description="requirements.length ? '没有匹配的需求' : '当前项目暂无需求'"
    />
  </div>
</template>

<style scoped>
.requirement-bind-list__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  min-width: 0;
}

.requirement-bind-list__count {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--pc-text);
  white-space: nowrap;
}

.requirement-bind-list__filters {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.requirement-bind-list__status {
  width: 140px;
  flex-shrink: 0;
}

.requirement-bind-list__search {
  width: 220px;
  flex-shrink: 1;
  min-width: 140px;
}

.requirement-bind-list__items {
  display: block;
  width: 100%;
  max-height: 52vh;
  overflow-y: auto;
  padding-right: 4px;
}

[data-requirement-list] :deep(.requirement-row.el-checkbox) {
  display: flex;
  width: 100%;
  height: auto;
  min-height: 48px;
  margin: 0;
  padding: 0;
  /* 与标题行对齐，而不是整块（含描述）垂直居中 */
  align-items: flex-start;
}

[data-requirement-list] :deep(.requirement-row .el-checkbox__input) {
  /* padding-top 12px + 标题行内光学居中 */
  margin-top: 14px;
}

[data-requirement-list] :deep(.requirement-row .el-checkbox__inner) {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

[data-requirement-list] :deep(.requirement-row .el-checkbox__label) {
  display: flex;
  flex: 1;
  min-width: 0;
  width: 100%;
  margin-left: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--pc-border-soft);
  line-height: 1.4;
  color: var(--pc-text);
}

[data-requirement-list] :deep(.requirement-row.el-checkbox:last-child .el-checkbox__label) {
  border-bottom: 0;
}

.requirement-row__body {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  column-gap: 8px;
  row-gap: 4px;
  align-items: center;
  min-width: 0;
}

.requirement-row__title {
  grid-column: 1;
  grid-row: 1;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--pc-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.requirement-row__status {
  display: inline-flex;
  grid-column: 2;
  grid-row: 1;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 400;
  line-height: 1;
  white-space: nowrap;
}

.requirement-row__binding {
  display: inline-flex;
  grid-column: 1;
  grid-row: 2;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.requirement-row__priority {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  height: 18px;
  padding: 0 6px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--pc-action) 12%, var(--pc-surface));
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: var(--pc-action);
}

.requirement-row__binding-text {
  overflow: hidden;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--pc-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.requirement-row__dot {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
</style>
