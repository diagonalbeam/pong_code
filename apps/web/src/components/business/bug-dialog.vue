<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { reactive, ref, watch } from 'vue'
import { addBugEvidence, createBug } from '@/api/bugs'
import { apiErrorMessage } from '@/api/client'
import type { Requirement, Sprint, User } from '@/api/types'
import AppDialog from '@/components/app-dialog.vue'
import ScreenshotUpload from '@/components/screenshot-upload.vue'
import {
  bugDiscoveryChannelLabels,
  bugDiscoveryPhaseLabels,
  bugPlatformLabels,
  bugPriorityLabels,
  bugTypeLabels,
  type BugDiscoveryChannel,
  type BugDiscoveryPhase,
  type BugPlatform,
  type BugPriority,
  type BugType,
} from '@/shared/bug'

const props = defineProps<{
  modelValue: boolean
  projectId: number
  sprintId?: number | null
  requirementId?: number | null
  requirements: Requirement[]
  sprints: Sprint[]
  users: User[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const DEFAULT_STEPS = `1. 进入页面：
2. 执行操作：
3. 观察结果：`
const submitting = ref(false)
const files = ref<File[]>([])
const form = reactive({
  title: '',
  description: '',
  severity: 3,
  status: 'open',
  bug_type: 'functional' as BugType,
  priority: 'normal' as BugPriority,
  platform: 'server' as BugPlatform,
  discovery_phase: 'round_1' as BugDiscoveryPhase,
  discovery_channel: undefined as BugDiscoveryChannel | undefined,
  steps_to_reproduce: DEFAULT_STEPS,
  assignee_id: undefined as number | undefined,
  sprint_id: undefined as number | undefined,
  requirement_id: undefined as number | undefined,
  evidence_comment: '',
  evidence_stack_trace: '',
})

watch(() => props.modelValue, (open) => {
  if (!open)
    return
  Object.assign(form, {
    title: '',
    description: '',
    severity: 3,
    status: 'open',
    bug_type: 'functional',
    priority: 'normal',
    platform: 'server',
    discovery_phase: 'round_1',
    discovery_channel: undefined,
    steps_to_reproduce: DEFAULT_STEPS,
    assignee_id: undefined,
    sprint_id: props.sprintId || undefined,
    requirement_id: props.requirementId || undefined,
    evidence_comment: '',
    evidence_stack_trace: '',
  })
  files.value = []
})

async function submit() {
  if (!form.title.trim() || !form.description.trim()) {
    ElMessage.warning('标题和缺陷描述为必填项')
    return
  }
  submitting.value = true
  try {
    const bug = await createBug(props.projectId, {
      title: form.title.trim(),
      description: form.description.trim(),
      severity: form.severity,
      status: form.status,
      bug_type: form.bug_type,
      priority: form.priority,
      platform: form.platform,
      discovery_phase: form.discovery_phase,
      discovery_channel: form.discovery_channel || null,
      steps_to_reproduce: form.steps_to_reproduce,
      assignee_id: form.assignee_id || null,
      sprint_id: form.sprint_id || null,
      requirement_id: form.requirement_id || null,
    })

    if (form.evidence_comment.trim() || form.evidence_stack_trace.trim() || files.value.length) {
      const evidence = new FormData()
      evidence.set('comment', form.evidence_comment)
      evidence.set('stack_trace', form.evidence_stack_trace)
      for (const file of files.value)
        evidence.append('screenshots', file)
      try {
        await addBugEvidence(bug.id, evidence)
      }
      catch (error) {
        ElMessage.warning(`缺陷已创建，但证据保存失败：${apiErrorMessage(error)}`)
      }
    }

    ElMessage.success('缺陷创建成功')
    emit('update:modelValue', false)
    emit('saved')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '创建缺陷失败'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog
    :model-value="modelValue"
    title="新建缺陷"
    width="min(94vw, 912px)"
    :loading="submitting"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="缺陷标题" required>
        <el-input v-model="form.title" data-testid="create-bug-title-input" maxlength="200" placeholder="简要说明发现的问题" />
      </el-form-item>
      <el-form-item label="缺陷描述" required>
        <el-input v-model="form.description" data-testid="create-bug-description-input" type="textarea" :rows="4" placeholder="说明实际发生了什么" />
      </el-form-item>
      <el-form-item label="复现步骤">
        <el-input v-model="form.steps_to_reproduce" type="textarea" :rows="7" resize="vertical" />
      </el-form-item>
      <div class="pc-form-grid grid grid-cols-2 max-sm:grid-cols-1">
        <el-form-item label="缺陷类型" required>
          <el-select v-model="form.bug_type" class="w-full">
            <el-option v-for="(label, value) in bugTypeLabels" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="紧急程度" required>
          <el-select v-model="form.priority" class="w-full">
            <el-option v-for="(label, value) in bugPriorityLabels" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="缺陷平台" required>
          <el-select v-model="form.platform" class="w-full">
            <el-option v-for="(label, value) in bugPlatformLabels" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="发现阶段" required>
          <el-select v-model="form.discovery_phase" class="w-full">
            <el-option v-for="(label, value) in bugDiscoveryPhaseLabels" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="发现渠道">
          <el-select v-model="form.discovery_channel" clearable class="w-full" placeholder="请选择（可选）">
            <el-option v-for="(label, value) in bugDiscoveryChannelLabels" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="严重程度">
          <el-select v-model="form.severity" class="w-full">
            <el-option v-for="level in 5" :key="level" :label="`S${level}`" :value="level" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="form.assignee_id" filterable clearable class="w-full">
            <el-option v-for="user in users" :key="user.id" :label="user.username" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属迭代">
          <el-select v-model="form.sprint_id" clearable class="w-full">
            <el-option v-for="sprint in sprints" :key="sprint.id" :label="sprint.name" :value="sprint.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联需求">
          <el-select v-model="form.requirement_id" filterable clearable class="w-full">
            <el-option v-for="item in requirements" :key="item.id" :label="item.title" :value="item.id" />
          </el-select>
        </el-form-item>
      </div>
      <el-divider content-position="left">
        首次证据（可选）
      </el-divider>
      <el-form-item label="补充说明">
        <el-input v-model="form.evidence_comment" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="异常堆栈">
        <el-input v-model="form.evidence_stack_trace" data-stack-input type="textarea" :rows="5" />
      </el-form-item>
      <el-form-item label="截图">
        <ScreenshotUpload v-model="files" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        取消
      </el-button>
      <el-button type="primary" data-testid="create-bug-submit-button" :loading="submitting" @click="submit">
        创建缺陷
      </el-button>
    </template>
  </AppDialog>
</template>

<style scoped>
[data-stack-input] :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
