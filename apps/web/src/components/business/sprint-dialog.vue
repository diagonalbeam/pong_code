<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { reactive, ref, watch } from 'vue'
import { createSprint } from '@/api/sprints'
import { apiErrorMessage } from '@/api/client'
import type { User } from '@/api/types'
import AppDialog from '@/components/app-dialog.vue'

const props = defineProps<{
  modelValue: boolean
  projectId: number
  users: User[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const submitting = ref(false)
const form = reactive({
  name: '',
  start_date: '',
  end_date: '',
  category: '',
  owner_id: undefined as number | undefined,
  description: '',
  goal: '',
})

watch(() => props.modelValue, (open) => {
  if (!open)
    return
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 14)
  Object.assign(form, {
    name: '',
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    category: '',
    owner_id: undefined,
    description: '',
    goal: '',
  })
})

async function submit() {
  if (!form.name.trim() || !form.start_date || !form.end_date) {
    ElMessage.warning('请填写迭代名称和日期')
    return
  }
  submitting.value = true
  try {
    await createSprint(props.projectId, {
      ...form,
      name: form.name.trim(),
      owner_id: form.owner_id || null,
    })
    ElMessage.success('迭代创建成功')
    emit('update:modelValue', false)
    emit('saved')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '创建迭代失败'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog
    :model-value="modelValue"
    title="新建迭代"
    width="680px"
    :loading="submitting"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="迭代名称" required>
        <el-input v-model="form.name" data-testid="create-sprint-name-input" maxlength="64" placeholder="例如：Sprint 10" />
      </el-form-item>
      <div class="pc-form-grid grid grid-cols-2 max-[600px]:grid-cols-1">
        <el-form-item label="开始日期" required>
          <el-date-picker v-model="form.start_date" data-testid="create-sprint-start-date-input" type="date" value-format="YYYY-MM-DD" class="w-full" />
        </el-form-item>
        <el-form-item label="结束日期" required>
          <el-date-picker v-model="form.end_date" data-testid="create-sprint-end-date-input" type="date" value-format="YYYY-MM-DD" class="w-full" />
        </el-form-item>
        <el-form-item label="类别">
          <el-input v-model="form.category" placeholder="产品迭代、技术迭代" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="form.owner_id" filterable clearable class="w-full">
            <el-option v-for="user in users" :key="user.id" :label="user.username" :value="user.id" />
          </el-select>
        </el-form-item>
      </div>
      <el-form-item label="迭代目标">
        <el-input v-model="form.goal" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.description" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        取消
      </el-button>
      <el-button type="primary" data-testid="create-sprint-submit-button" :loading="submitting" @click="submit">
        创建迭代
      </el-button>
    </template>
  </AppDialog>
</template>
