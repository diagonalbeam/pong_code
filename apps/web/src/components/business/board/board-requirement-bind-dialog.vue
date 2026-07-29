<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { ref, watch } from 'vue'
import { updateSprintRequirements } from '@/api/sprints'
import { apiErrorMessage } from '@/api/client'
import type { Requirement } from '@/api/types'
import AppDialog from '@/components/app-dialog.vue'
import RequirementBindList from '@/components/business/requirement-bind-list.vue'

const props = defineProps<{
  modelValue: boolean
  sprintId: number
  requirements: Requirement[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'updated': []
}>()

const selectedIds = ref<number[]>([])
const initialIds = ref<number[]>([])
const saving = ref(false)

watch(
  () => [props.modelValue, props.sprintId, props.requirements] as const,
  ([open, sprintId, requirements]) => {
    if (!open)
      return
    const currentIds = requirements
      .filter(item => item.sprint_id === sprintId)
      .map(item => item.id)
    initialIds.value = currentIds
    selectedIds.value = [...currentIds]
  },
  { immediate: true },
)

async function submit() {
  const selected = new Set(selectedIds.value)
  const unboundCount = initialIds.value.filter(id => !selected.has(id)).length

  if (unboundCount > 0) {
    try {
      await ElMessageBox.confirm(
        `取消绑定后，对应的 ${unboundCount} 个需求下属于当前迭代的任务及工时将被删除，此操作不可撤销。确定继续吗？`,
        '确认取消绑定',
        {
          type: 'warning',
          confirmButtonText: '确定继续',
        },
      )
    }
    catch (error) {
      if (error === 'cancel' || error === 'close')
        return
      throw error
    }
  }

  saving.value = true
  try {
    await updateSprintRequirements(props.sprintId, selectedIds.value, unboundCount > 0)
    ElMessage.success('需求绑定已更新')
    emit('update:modelValue', false)
    emit('updated')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '更新需求绑定失败'))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDialog
    :model-value="modelValue"
    title="绑定需求"
    width="min(92vw, 680px)"
    :loading="saving"
    title-testid="board-requirement-bind-dialog-title"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <RequirementBindList
      v-model="selectedIds"
      :requirements="requirements"
      :sprint-id="sprintId"
      list-testid="board-requirement-list"
    />

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="saving"
        data-testid="board-requirement-bind-submit"
        @click="submit"
      >
        保存绑定
      </el-button>
    </template>
  </AppDialog>
</template>
