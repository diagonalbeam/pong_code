<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ref, watch } from 'vue'
import { batchBindRequirementsToSprint } from '@/api/requirements'
import { apiErrorMessage } from '@/api/client'
import type { Sprint } from '@/api/types'
import AppDialog from '@/components/app-dialog.vue'

const props = defineProps<{
  modelValue: boolean
  projectId: number
  requirementIds: number[]
  sprints: Sprint[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'bound': [sprint: Sprint, count: number]
}>()

const selectedSprintId = ref<number | null>(null)
const saving = ref(false)

watch(
  () => [props.modelValue, props.sprints] as const,
  ([open, sprints]) => {
    if (open)
      selectedSprintId.value = sprints[0]?.id ?? null
  },
  { immediate: true },
)

async function submit() {
  if (!selectedSprintId.value || !props.requirementIds.length)
    return

  saving.value = true
  try {
    const result = await batchBindRequirementsToSprint(
      props.projectId,
      props.requirementIds,
      selectedSprintId.value,
    )
    emit('update:modelValue', false)
    emit('bound', result.sprint, result.updated_count)
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '批量绑定迭代失败'))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDialog
    :model-value="modelValue"
    title="批量绑定迭代"
    width="min(92vw, 560px)"
    :loading="saving"
    title-testid="requirement-batch-bind-dialog-title"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="mt-0 mb-4 text-sm text-[var(--pc-text-secondary)]">
      将已选择的 {{ requirementIds.length }} 个需求绑定到一个迭代
    </p>

    <el-radio-group
      v-if="sprints.length"
      v-model="selectedSprintId"
      class="grid w-full gap-2"
      data-testid="requirement-batch-sprint-list"
    >
      <el-radio
        v-for="sprint in sprints"
        :key="sprint.id"
        :value="sprint.id"
        border
        class="m-0! w-full"
      >
        {{ sprint.name }}
      </el-radio>
    </el-radio-group>
    <el-empty v-else :image-size="72" description="当前项目暂无迭代" />

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ sprints.length ? '取消' : '关闭' }}
      </el-button>
      <el-button
        v-if="sprints.length"
        type="primary"
        :loading="saving"
        :disabled="!selectedSprintId"
        data-testid="requirement-batch-bind-submit"
        @click="submit"
      >
        确定绑定
      </el-button>
    </template>
  </AppDialog>
</template>
