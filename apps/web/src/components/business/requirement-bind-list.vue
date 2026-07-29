<script setup lang="ts">
import type { Requirement } from '@/api/types'

const props = defineProps<{
  modelValue: number[]
  requirements: Requirement[]
  sprintId: number
  listTestid?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const requirementStatusLabels: Record<string, string> = {
  pending: '等待排期',
  in_progress: '进行中',
  testing: '等待测试',
  completed: '已完成',
}

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
  <el-checkbox-group
    :model-value="modelValue"
    class="requirement-bind-list block w-full"
    :data-testid="listTestid"
    data-requirement-list
    @update:model-value="emit('update:modelValue', $event as number[])"
  >
    <el-checkbox
      v-for="item in requirements"
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
</template>

<style scoped>
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
