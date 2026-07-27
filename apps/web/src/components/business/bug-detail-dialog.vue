<script setup lang="ts">
import { Delete, Picture } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { reactive, ref, watch } from 'vue'
import {
  addBugEvidence,
  addBugWorklog,
  deleteBug,
  deleteBugWorklog,
  getBug,
  updateBug,
} from '@/api/bugs'
import { apiErrorMessage } from '@/api/client'
import type { Bug, BugEvidence, Requirement, Sprint, User, WorkLog } from '@/api/types'
import AppDialog from '@/components/app-dialog.vue'
import StatusTag from '@/components/status-tag.vue'
import { bugStatusLabels } from '@/shared/bug'
import WorklogForm from './worklog-form.vue'

const props = defineProps<{
  modelValue: boolean
  bugId: number | null
  requirements: Requirement[]
  sprints: Sprint[]
  users: User[]
  initialTab?: 'detail' | 'evidence' | 'time'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'changed': []
}>()

const loading = ref(false)
const saving = ref(false)
const tab = ref<'detail' | 'evidence' | 'time'>('detail')
const bug = ref<Bug | null>(null)
const workLogs = ref<WorkLog[]>([])
const evidences = ref<BugEvidence[]>([])
const evidenceFiles = ref<File[]>([])
const evidenceSubmitting = ref(false)
const form = reactive({
  title: '',
  description: '',
  severity: 3,
  status: 'open',
  steps_to_reproduce: '',
  time_estimate: 0,
  assignee_id: undefined as number | undefined,
  sprint_id: undefined as number | undefined,
  requirement_id: undefined as number | undefined,
})
const evidenceForm = reactive({ comment: '', stack_trace: '' })

watch(
  () => [props.modelValue, props.bugId, props.initialTab] as const,
  async ([open]) => {
    if (open && props.bugId) {
      tab.value = props.initialTab || 'detail'
      await load()
    }
  },
  { immediate: true },
)

async function load() {
  if (!props.bugId)
    return
  loading.value = true
  try {
    const result = await getBug(props.bugId)
    bug.value = result.bug
    workLogs.value = result.work_logs
    evidences.value = result.evidences
    Object.assign(form, {
      title: result.bug.title,
      description: result.bug.description,
      severity: result.bug.severity,
      status: result.bug.status === 'resolved' ? 'fixed' : result.bug.status,
      steps_to_reproduce: result.bug.steps_to_reproduce || '',
      time_estimate: result.bug.time_estimate || 0,
      assignee_id: result.bug.assignee_id || undefined,
      sprint_id: result.bug.sprint_id || undefined,
      requirement_id: result.bug.requirement_id || undefined,
    })
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载缺陷失败'))
  }
  finally {
    loading.value = false
  }
}

async function save() {
  if (!props.bugId || !form.title.trim() || !form.description.trim())
    return
  saving.value = true
  try {
    await updateBug(props.bugId, {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      assignee_id: form.assignee_id || null,
      sprint_id: form.sprint_id || null,
      requirement_id: form.requirement_id || null,
    })
    ElMessage.success('缺陷已更新')
    emit('update:modelValue', false)
    emit('changed')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '更新缺陷失败'))
  }
  finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.bugId || !bug.value)
    return
  try {
    await ElMessageBox.confirm(`确认删除缺陷“${bug.value.title}”及其工时和证据？`, '删除缺陷', { type: 'warning', confirmButtonText: '删除' })
    await deleteBug(props.bugId)
    ElMessage.success('缺陷已删除')
    emit('update:modelValue', false)
    emit('changed')
  }
  catch (error) {
    if (error === 'cancel' || error === 'close')
      return
    ElMessage.error(apiErrorMessage(error, '删除缺陷失败'))
  }
}

function onFiles(event: Event) {
  evidenceFiles.value = Array.from((event.target as HTMLInputElement).files || []).slice(0, 5)
}

async function addEvidence() {
  if (!props.bugId)
    return
  if (!evidenceForm.comment.trim() && !evidenceForm.stack_trace.trim() && !evidenceFiles.value.length) {
    ElMessage.warning('请至少填写说明、堆栈或上传一张截图')
    return
  }
  evidenceSubmitting.value = true
  try {
    const payload = new FormData()
    payload.set('comment', evidenceForm.comment)
    payload.set('stack_trace', evidenceForm.stack_trace)
    for (const file of evidenceFiles.value)
      payload.append('screenshots', file)
    await addBugEvidence(props.bugId, payload)
    evidenceForm.comment = ''
    evidenceForm.stack_trace = ''
    evidenceFiles.value = []
    ElMessage.success('证据已添加')
    await load()
    emit('changed')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '保存证据失败'))
  }
  finally {
    evidenceSubmitting.value = false
  }
}

async function addWorklog(value: { date: string; hours: number; description: string }, done: () => void) {
  if (!props.bugId)
    return
  try {
    await addBugWorklog(props.bugId, value)
    ElMessage.success('工时已登记')
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

async function removeWorklog(log: WorkLog) {
  if (!props.bugId)
    return
  try {
    await deleteBugWorklog(props.bugId, log.id)
    await load()
    emit('changed')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '删除工时失败'))
  }
}
</script>

<template>
  <AppDialog
    :model-value="modelValue"
    title="缺陷详情"
    title-testid="bug-detail-title"
    width="min(92vw, 820px)"
    :loading="loading || saving"
    :show-footer="tab === 'detail'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header-extra>
      <StatusTag v-if="bug" :status="bug.status" :label="bugStatusLabels[bug.status]" />
    </template>
    <div v-loading="loading">
      <el-tabs v-model="tab">
        <el-tab-pane label="详情" name="detail">
          <el-alert
            v-if="bug && !bug.steps_to_reproduce && (bug.environment || bug.expected_result || bug.actual_result)"
            title="该历史缺陷包含旧版环境、期望结果或实际结果字段，字段内容将只读保留。"
            type="info"
            :closable="false"
            class="mb-[17px]"
          />
          <el-form label-position="top" @submit.prevent="save">
            <el-form-item label="标题" required>
              <el-input v-model="form.title" maxlength="200" />
            </el-form-item>
            <el-form-item label="描述" required>
              <el-input v-model="form.description" type="textarea" :rows="4" />
            </el-form-item>
            <el-form-item label="复现步骤">
              <el-input v-model="form.steps_to_reproduce" type="textarea" :rows="7" resize="vertical" />
            </el-form-item>
            <div class="pc-form-grid grid grid-cols-2 max-sm:grid-cols-1">
              <el-form-item label="状态">
                <el-select v-model="form.status" class="w-full">
                  <el-option label="待处理" value="open" />
                  <el-option label="处理中" value="in_progress" />
                  <el-option label="已修复" value="fixed" />
                  <el-option label="已关闭" value="closed" />
                  <el-option label="已拒绝" value="rejected" />
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
              <el-form-item label="预估工时">
                <el-input-number v-model="form.time_estimate" :min="0" :step="0.5" class="w-full" />
              </el-form-item>
            </div>
          </el-form>
        </el-tab-pane>

        <el-tab-pane :label="`证据 (${evidences.length})`" name="evidence">
          <section data-testid="bug-detail-evidence-section">
            <el-form data-testid="add-bug-evidence-form" label-position="top" class="pc-compact-form-surface" @submit.prevent="addEvidence">
              <el-form-item label="补充说明">
                <el-input v-model="evidenceForm.comment" data-testid="add-bug-evidence-comment-input" type="textarea" :rows="3" />
              </el-form-item>
              <el-form-item label="异常堆栈">
                <el-input v-model="evidenceForm.stack_trace" data-testid="add-bug-evidence-stack-input" data-stack-input type="textarea" :rows="7" />
              </el-form-item>
              <el-form-item label="截图（最多 5 张，每张不超过 5MB）">
                <input class="max-w-full text-sm text-[var(--pc-text-secondary)]" data-testid="add-bug-evidence-file-input" type="file" multiple accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" @change="onFiles">
              </el-form-item>
              <el-button type="primary" data-testid="add-bug-evidence-submit-button" :loading="evidenceSubmitting" @click="addEvidence">
                添加证据
              </el-button>
            </el-form>

            <div class="mt-[17px] grid gap-3">
              <article v-for="evidence in evidences" :key="evidence.id" class="rounded-[8px] border border-[var(--pc-border-soft)] p-[17px]">
                <header class="flex items-center justify-between gap-3">
                  <strong class="text-sm">{{ evidence.creator_name || '未知用户' }}</strong>
                  <time class="text-xs text-[var(--pc-text-muted)]">{{ evidence.created_at?.replace('T', ' ').slice(0, 16) }}</time>
                </header>
                <p v-if="evidence.comment" class="mt-3 mb-0 whitespace-pre-wrap">
                  {{ evidence.comment }}
                </p>
                <pre v-if="evidence.stack_trace" class="mt-3 mb-0 max-h-[260px] overflow-auto rounded-[8px] bg-[#171719] p-3 font-mono text-xs whitespace-pre-wrap text-[#f5f5f7]">{{ evidence.stack_trace }}</pre>
                <div v-if="evidence.attachments.length" class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                  <a
                    v-for="attachment in evidence.attachments"
                    :key="attachment.id"
                    class="grid gap-1.5 text-xs text-[var(--pc-text-secondary)] no-underline"
                    :href="attachment.url"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img class="aspect-square w-full rounded-[8px] object-cover" :src="attachment.url" :alt="attachment.file_name">
                    <span class="overflow-hidden text-ellipsis whitespace-nowrap">{{ attachment.file_name }}</span>
                  </a>
                </div>
              </article>
              <el-empty v-if="!evidences.length" :image-size="64" description="还没有缺陷证据">
                <template #image>
                  <el-icon :size="42"><Picture /></el-icon>
                </template>
              </el-empty>
            </div>
          </section>
        </el-tab-pane>

        <el-tab-pane :label="`工时 (${workLogs.length})`" name="time">
          <WorklogForm @submit="addWorklog" />
          <div class="mt-[17px]">
            <article v-for="log in workLogs" :key="log.id" class="flex min-h-16 items-center justify-between gap-3 border-b border-[var(--pc-border-soft)] py-2.5">
              <div class="flex flex-col items-start gap-0.5">
                <strong class="text-sm font-semibold">{{ log.user_name }}</strong>
                <span class="text-[13px] text-[var(--pc-text-secondary)]">{{ log.date }} · {{ log.description || '无说明' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <b class="text-sm font-semibold">{{ log.hours }}h</b>
                <el-button v-if="log.can_delete" circle text type="danger" data-testid="delete-bug-worklog-button" @click="removeWorklog(log)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </article>
            <el-empty v-if="!workLogs.length" :image-size="64" description="还没有工时记录" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <el-button type="danger" text @click="remove">
        <el-icon><Delete /></el-icon>删除缺陷
      </el-button>
      <el-button type="primary" :loading="saving" @click="save">
        保存修改
      </el-button>
    </template>
  </AppDialog>
</template>

<style scoped>
[data-stack-input] :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
