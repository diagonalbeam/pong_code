<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { reactive, ref, watch } from 'vue'
import { createRequirement } from '@/api/requirements'
import { apiErrorMessage } from '@/api/client'
import type { Sprint } from '@/api/types'
import AppDialog from '@/components/app-dialog.vue'

const props = defineProps<{
  modelValue: boolean
  projectId: number
  sprints: Sprint[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const submitting = ref(false)
const form = reactive({
  title: '',
  content: '',
  priority: 3,
  status: 'pending',
  sprint_id: undefined as number | undefined,
  expected_delivery_date: '',
})

watch(() => props.modelValue, (open) => {
  if (!open)
    return
  Object.assign(form, {
    title: '',
    content: '',
    priority: 3,
    status: 'pending',
    sprint_id: undefined,
    expected_delivery_date: '',
  })
})

async function submit() {
  if (!form.title.trim() || !form.content.trim()) {
    ElMessage.warning('标题和需求内容为必填项')
    return
  }
  submitting.value = true
  try {
    await createRequirement(props.projectId, {
      ...form,
      title: form.title.trim(),
      content: form.content.trim(),
      sprint_id: form.sprint_id || null,
      expected_delivery_date: form.expected_delivery_date || null,
    })
    ElMessage.success('需求创建成功')
    emit('update:modelValue', false)
    emit('saved')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '创建需求失败'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog
    :model-value="modelValue"
    title="新建需求"
    width="680px"
    :loading="submitting"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="需求标题" required>
        <el-input v-model="form.title" data-testid="create-requirement-title-input" maxlength="200" placeholder="用一句话描述用户目标" />
      </el-form-item>
      <el-form-item label="需求内容" required>
        <el-input v-model="form.content" data-testid="create-requirement-content-input" type="textarea" :rows="7" resize="vertical" placeholder="补充范围、验收标准和背景信息" />
      </el-form-item>
      <div class="pc-form-grid grid grid-cols-2 max-[600px]:grid-cols-1">
        <el-form-item label="状态">
          <el-select v-model="form.status" class="w-full">
            <el-option label="待规划" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="测试中" value="testing" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="form.priority" class="w-full">
            <el-option v-for="level in 5" :key="level" :label="`P${level}`" :value="level" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属迭代">
          <el-select v-model="form.sprint_id" filterable clearable class="w-full">
            <el-option v-for="sprint in sprints" :key="sprint.id" :label="sprint.name" :value="sprint.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="期望交付日期">
          <el-date-picker v-model="form.expected_delivery_date" value-format="YYYY-MM-DD" type="date" placeholder="选择日期" class="w-full" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        取消
      </el-button>
      <el-button type="primary" data-testid="create-requirement-submit-button" :loading="submitting" @click="submit">
        创建需求
      </el-button>
    </template>
  </AppDialog>
</template>
