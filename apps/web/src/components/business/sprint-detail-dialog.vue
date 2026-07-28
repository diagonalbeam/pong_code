<script setup lang="ts">
import { Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { reactive, ref, watch } from 'vue'
import {
  addSprintWorklog,
  deleteSprint,
  getSprint,
  getSprintRequirements,
  updateSprint,
  updateSprintRequirements,
} from '@/api/sprints'
import { apiErrorMessage } from '@/api/client'
import type { Requirement, Sprint, User, WorkLog } from '@/api/types'
import AppDialog from '@/components/app-dialog.vue'
import StatusTag from '@/components/status-tag.vue'
import WorklogForm from './worklog-form.vue'
import WorklogList from './worklog-list.vue'

const props = defineProps<{
  modelValue: boolean
  sprintId: number | null
  users: User[]
  allRequirements: Requirement[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'changed': []
}>()

const loading = ref(false)
const saving = ref(false)
const tab = ref('detail')
const sprint = ref<Sprint | null>(null)
const workLogs = ref<WorkLog[]>([])
const canDelete = ref(false)
const selectedRequirements = ref<number[]>([])
const form = reactive({
  name: '',
  status: 'active',
  start_date: '',
  end_date: '',
  category: '',
  owner_id: undefined as number | undefined,
  description: '',
  goal: '',
})

watch(() => [props.modelValue, props.sprintId] as const, async ([open]) => {
  if (open && props.sprintId)
    await load()
}, { immediate: true })

async function load() {
  if (!props.sprintId)
    return
  loading.value = true
  try {
    const [details, requirements] = await Promise.all([
      getSprint(props.sprintId),
      getSprintRequirements(props.sprintId),
    ])
    sprint.value = details.sprint
    workLogs.value = details.work_logs
    canDelete.value = details.can_delete
    selectedRequirements.value = requirements.requirements.map(item => item.id)
    Object.assign(form, {
      name: details.sprint.name,
      status: details.sprint.status,
      start_date: details.sprint.start_date || '',
      end_date: details.sprint.end_date || '',
      category: details.sprint.category || '',
      owner_id: details.sprint.owner_id || undefined,
      description: details.sprint.description || '',
      goal: details.sprint.goal || '',
    })
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载迭代失败'))
  }
  finally {
    loading.value = false
  }
}

async function save() {
  if (!props.sprintId || !form.name.trim())
    return
  saving.value = true
  try {
    await updateSprint(props.sprintId, {
      ...form,
      name: form.name.trim(),
      owner_id: form.owner_id || null,
    })
    ElMessage.success('迭代已更新')
    emit('update:modelValue', false)
    emit('changed')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '更新迭代失败'))
  }
  finally {
    saving.value = false
  }
}

async function saveRequirements() {
  if (!props.sprintId)
    return
  saving.value = true
  try {
    await updateSprintRequirements(props.sprintId, selectedRequirements.value)
    ElMessage.success('关联需求已更新')
    await load()
    emit('changed')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '更新关联需求失败'))
  }
  finally {
    saving.value = false
  }
}

async function addWorklog(value: { date: string; hours: number; description: string }, done: () => void) {
  if (!props.sprintId)
    return
  try {
    await addSprintWorklog(props.sprintId, value)
    ElMessage.success('迭代工时已登记')
    await load()
    emit('changed')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '登记工时失败'))
  }
  finally {
    done()
  }
}

async function remove() {
  if (!props.sprintId || !sprint.value)
    return
  try {
    await ElMessageBox.confirm(
      `删除迭代“${sprint.value.name}”会删除其中任务及任务工时；需求和缺陷会保留并解除迭代关联。`,
      '确认删除迭代',
      { type: 'warning', confirmButtonText: '删除迭代' },
    )
    await deleteSprint(props.sprintId)
    ElMessage.success('迭代已删除')
    emit('update:modelValue', false)
    emit('changed')
  }
  catch (error) {
    if (error === 'cancel' || error === 'close')
      return
    ElMessage.error(apiErrorMessage(error, '删除迭代失败'))
  }
}
</script>

<template>
  <AppDialog
    :model-value="modelValue"
    title="迭代详情"
    width="min(92vw, 760px)"
    :loading="loading || saving"
    :show-footer="tab === 'detail'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header-extra>
      <StatusTag v-if="sprint" :status="sprint.status" />
    </template>
    <div v-loading="loading">
      <el-tabs v-model="tab">
        <el-tab-pane label="详情" name="detail">
          <el-form label-position="top">
            <el-form-item label="迭代名称">
              <el-input v-model="form.name" />
            </el-form-item>
            <div class="pc-form-grid grid grid-cols-2 max-[600px]:grid-cols-1">
              <el-form-item label="状态">
                <el-select v-model="form.status" class="w-full">
                  <el-option label="未开始" value="open" />
                  <el-option label="进行中" value="active" />
                  <el-option label="已完成" value="closed" />
                </el-select>
              </el-form-item>
              <el-form-item label="类别">
                <el-input v-model="form.category" />
              </el-form-item>
              <el-form-item label="开始日期">
                <el-date-picker v-model="form.start_date" type="date" value-format="YYYY-MM-DD" class="w-full" />
              </el-form-item>
              <el-form-item label="结束日期">
                <el-date-picker v-model="form.end_date" type="date" value-format="YYYY-MM-DD" class="w-full" />
              </el-form-item>
              <el-form-item label="负责人">
                <el-select v-model="form.owner_id" filterable clearable class="w-full">
                  <el-option v-for="user in users" :key="user.id" :label="user.username" :value="user.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="已登记工时">
                <el-input :model-value="`${sprint?.time_spent || 0} 小时`" disabled />
              </el-form-item>
            </div>
            <el-form-item label="目标">
              <el-input v-model="form.goal" type="textarea" :rows="3" />
            </el-form-item>
            <el-form-item label="描述">
              <el-input v-model="form.description" type="textarea" :rows="3" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane :label="`需求 (${selectedRequirements.length})`" name="requirements">
          <el-checkbox-group v-model="selectedRequirements" data-requirement-list class="mb-[17px] grid gap-2">
            <el-checkbox v-for="item in allRequirements" :key="item.id" :value="item.id">
              <div>
                <strong class="block text-sm">{{ item.title }}</strong>
                <span class="block text-xs text-[var(--pc-text-secondary)]">P{{ item.priority }} · {{ item.status }}</span>
              </div>
            </el-checkbox>
          </el-checkbox-group>
          <el-empty v-if="!allRequirements.length" :image-size="64" description="项目还没有需求" />
          <el-button v-else type="primary" :loading="saving" @click="saveRequirements">
            保存关联需求
          </el-button>
        </el-tab-pane>
        <el-tab-pane :label="`工时 (${workLogs.length})`" name="time">
          <WorklogForm @submit="addWorklog" />
          <WorklogList
            class="mt-[17px]"
            :logs="workLogs"
            empty-description="还没有迭代工时"
          />
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <el-button v-if="canDelete" type="danger" text data-testid="delete-sprint-button" @click="remove">
        <el-icon><Delete /></el-icon>删除迭代
      </el-button>
      <el-button type="primary" :loading="saving" @click="save">
        保存修改
      </el-button>
    </template>
  </AppDialog>
</template>

<style scoped>
[data-requirement-list] :deep(.el-checkbox) {
  height: auto;
  min-height: 54px;
  margin: 0;
  padding: 8px 12px;
  align-items: flex-start;
  border: 1px solid var(--pc-border-soft);
  border-radius: 8px;
}
</style>
