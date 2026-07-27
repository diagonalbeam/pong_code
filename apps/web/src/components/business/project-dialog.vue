<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'
import { createProject, updateProject } from '@/api/projects'
import { apiErrorMessage } from '@/api/client'
import type { Project, Team } from '@/api/types'
import AppDialog from '@/components/app-dialog.vue'

const props = defineProps<{
  modelValue: boolean
  organizationId: number
  teams: Team[]
  project?: Project | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const submitting = ref(false)
const editing = computed(() => Boolean(props.project))
const form = reactive({
  name: '',
  team_id: undefined as number | undefined,
  description: '',
})

watch(
  () => [props.modelValue, props.project, props.teams] as const,
  () => {
    if (!props.modelValue)
      return
    const storageKey = `pongcode:last-project-team:${props.organizationId}`
    const last = Number(localStorage.getItem(storageKey))
    const fallbackTeam = props.teams.some(team => team.id === last) ? last : props.teams[0]?.id
    form.name = props.project?.name || ''
    form.team_id = props.project?.team_id || fallbackTeam
    form.description = props.project?.description || ''
  },
  { immediate: true },
)

async function submit() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  if (!form.team_id) {
    ElMessage.warning('请选择团队')
    return
  }
  submitting.value = true
  try {
    const payload = {
      name: form.name.trim(),
      team_id: form.team_id,
      description: form.description.trim(),
    }
    if (props.project)
      await updateProject(props.project.id, payload)
    else
      await createProject(props.organizationId, payload)
    localStorage.setItem(`pongcode:last-project-team:${props.organizationId}`, String(form.team_id))
    ElMessage.success(props.project ? '项目已更新' : '项目创建成功')
    emit('update:modelValue', false)
    emit('saved')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, props.project ? '更新项目失败' : '创建项目失败'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog
    :model-value="modelValue"
    :title="editing ? '编辑项目' : '创建项目'"
    width="520px"
    :loading="submitting"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="项目名称" required>
        <el-input v-model="form.name" :data-testid="editing ? 'edit-project-name-input' : 'create-project-name-input'" maxlength="64" placeholder="例如：移动端重构" />
      </el-form-item>
      <el-form-item label="所属团队" required>
        <el-select v-model="form.team_id" :data-testid="editing ? 'edit-project-team-select' : 'create-project-team-select'" class="w-full" placeholder="请选择团队">
          <el-option v-for="team in teams" :key="team.id" :label="team.name" :value="team.id" />
        </el-select>
        <el-alert v-if="!teams.length" type="warning" :closable="false" title="当前组织还没有团队，请先创建团队。" />
      </el-form-item>
      <el-form-item label="项目描述">
        <el-input v-model="form.description" :data-testid="editing ? 'edit-project-description-input' : 'create-project-description-input'" type="textarea" :rows="4" maxlength="1000" show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        取消
      </el-button>
      <el-button
        type="primary"
        :data-testid="editing ? 'edit-project-submit-button' : 'create-project-submit-button'"
        :disabled="!teams.length"
        :loading="submitting"
        @click="submit"
      >
        {{ editing ? '保存修改' : '创建项目' }}
      </el-button>
    </template>
  </AppDialog>
</template>
