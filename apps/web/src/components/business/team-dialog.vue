<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { createTeam } from '@/api/teams'
import { apiErrorMessage } from '@/api/client'
import AppDialog from '@/components/app-dialog.vue'

const props = defineProps<{
  modelValue: boolean
  organizationId: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const submitting = ref(false)
const form = reactive({ name: '', description: '' })

async function submit() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入团队名称')
    return
  }
  submitting.value = true
  try {
    await createTeam(props.organizationId, {
      name: form.name.trim(),
      description: form.description.trim(),
    })
    ElMessage.success('团队创建成功')
    form.name = ''
    form.description = ''
    emit('update:modelValue', false)
    emit('saved')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '创建团队失败'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog
    :model-value="modelValue"
    title="创建团队"
    width="500px"
    :loading="submitting"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="团队名称" required>
        <el-input v-model="form.name" data-testid="create-team-name-input" maxlength="64" placeholder="例如：研发团队" />
      </el-form-item>
      <el-form-item label="团队描述">
        <el-input v-model="form.description" data-testid="create-team-description-input" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        取消
      </el-button>
      <el-button type="primary" data-testid="create-team-submit-button" :loading="submitting" @click="submit">
        创建团队
      </el-button>
    </template>
  </AppDialog>
</template>
