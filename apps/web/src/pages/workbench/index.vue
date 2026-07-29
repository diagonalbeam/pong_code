<script setup lang="ts">
import { Clock, Document, Edit, Link, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getProject } from '@/api/projects'
import { getRequirements } from '@/api/requirements'
import { getUsers } from '@/api/users'
import { getWorkbench } from '@/api/workbench'
import { apiErrorMessage } from '@/api/client'
import type { Bug, Issue, Requirement, Sprint, User, WorkbenchLog, WorkbenchResponse } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import LoadingSkeleton from '@/components/loading-skeleton.vue'
import PageHeader from '@/components/page-header.vue'
import StatusTag from '@/components/status-tag.vue'
import BugDetailDialog from '@/components/business/bug-detail-dialog.vue'
import IssueDetailDialog from '@/components/business/issue-detail-dialog.vue'
import { bugStatusLabels } from '@/shared/bug'

const router = useRouter()
const now = new Date()
const today = now.toISOString().slice(0, 10)
const dateRange = ref<[string, string]>([today, today])
const loading = ref(true)
const data = ref<WorkbenchResponse | null>(null)
const users = ref<User[]>([])
const requirements = ref<Requirement[]>([])
const sprints = ref<Sprint[]>([])
const issueOpen = ref(false)
const bugOpen = ref(false)
const selectedIssueId = ref<number | null>(null)
const selectedBugId = ref<number | null>(null)
const issueTab = ref<'detail' | 'time'>('detail')
const bugTab = ref<'detail' | 'evidence' | 'time'>('detail')

const typeLabels: Record<WorkbenchLog['type'], string> = {
  task: '任务',
  bug: '缺陷',
  sprint: '迭代',
}

const typeTagTypes: Record<WorkbenchLog['type'], 'primary' | 'danger' | 'warning'> = {
  task: 'primary',
  bug: 'danger',
  sprint: 'warning',
}

const dailyHours = computed(() => {
  const result: Record<string, number> = {}
  for (const log of data.value?.work_logs || []) {
    if (log.type === 'sprint')
      continue
    result[log.date] = (result[log.date] || 0) + Number(log.hours)
  }
  return result
})

const workLogRows = computed(() => {
  const logs = data.value?.work_logs || []
  const dateCounts: Record<string, number> = {}
  for (const log of logs)
    dateCounts[log.date] = (dateCounts[log.date] || 0) + 1

  const seen = new Set<string>()
  return logs.map((log) => {
    const first = !seen.has(log.date)
    if (first)
      seen.add(log.date)
    return {
      ...log,
      showDate: first,
      dateRowSpan: first ? dateCounts[log.date] : 0,
    }
  })
})

const itemWorkHours = computed(() => {
  const totals: Record<string, number> = {}
  for (const log of data.value?.work_logs || []) {
    if (log.type === 'sprint')
      continue
    const key = `${log.type}:${log.item_id}`
    totals[key] = (totals[key] || 0) + Number(log.hours)
  }
  return totals
})

function priorityLabel(priority: number) {
  if (priority <= 2)
    return '高'
  if (priority === 3)
    return '中'
  return '低'
}

function taskHours(task: Issue) {
  return Number(itemWorkHours.value[`task:${task.id}`] ?? task.time_spent ?? 0)
}

function bugHours(bug: Bug) {
  return Number(itemWorkHours.value[`bug:${bug.id}`] ?? bug.time_spent ?? 0)
}

async function load() {
  loading.value = true
  try {
    data.value = await getWorkbench(dateRange.value[0], dateRange.value[1])
    if (!users.value.length)
      users.value = await getUsers()
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载工作台失败'))
  }
  finally {
    loading.value = false
  }
}

async function loadItemContext(projectId: number) {
  const [project, projectRequirements] = await Promise.all([
    getProject(projectId),
    getRequirements(projectId),
  ])
  sprints.value = project.sprints
  requirements.value = projectRequirements
}

async function openTask(task: Issue, initialTab: 'detail' | 'time' = 'detail') {
  try {
    await loadItemContext(task.project_id)
    selectedIssueId.value = task.id
    issueTab.value = initialTab
    issueOpen.value = true
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载任务失败'))
  }
}

async function openBug(bug: Bug, initialTab: 'detail' | 'time' = 'detail') {
  try {
    await loadItemContext(bug.project_id)
    selectedBugId.value = bug.id
    bugTab.value = initialTab
    bugOpen.value = true
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载缺陷失败'))
  }
}

async function goBoard(projectId: number, sprintId: number | null) {
  try {
    const details = await getProject(projectId)
    await router.push({
      path: `/organizations/${details.organization.id}/projects/${projectId}/board`,
      query: sprintId ? { sprint: sprintId } : {},
    })
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '打开看板失败'))
  }
}

onMounted(load)
</script>

<template>
  <div class="workbench mx-auto w-full max-w-[1100px] px-6 py-8 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader title="工作台" description="我的工时与未完成工作项">
      <div class="flex items-center gap-2.5">
        <span class="text-[13px] text-[var(--pc-text-muted)] max-sm:hidden">日期范围</span>
        <el-date-picker
          v-model="dateRange"
          data-testid="workbench-date-range-trigger"
          type="daterange"
          unlink-panels
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          @change="load"
        />
      </div>
    </PageHeader>

    <section class="workbench-card mb-5 overflow-hidden">
      <header class="flex items-start justify-between gap-4 px-6 pt-5 pb-4 max-md:px-4">
        <div class="min-w-0">
          <h2 class="m-0 font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-[21px] leading-tight font-semibold tracking-[0.01em] text-[var(--pc-text)]">
            已登记工时
          </h2>
          <p class="mt-1 mb-0 text-[13px] leading-5 text-[var(--pc-text-muted)]">
            {{ data?.start_date || dateRange[0] }}
            <template v-if="(data?.end_date || dateRange[1]) !== (data?.start_date || dateRange[0])">
              至 {{ data?.end_date || dateRange[1] }}
            </template>
          </p>
        </div>
        <div class="shrink-0 text-right">
          <strong class="block font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-[28px] leading-none font-semibold tracking-[-0.02em] text-[var(--pc-action)]">
            {{ Number(data?.total_hours || 0).toFixed(1) }}h
          </strong>
          <span class="mt-1 block text-[12px] text-[var(--pc-text-muted)]">共 {{ data?.work_logs.length || 0 }} 条</span>
        </div>
      </header>

      <LoadingSkeleton v-if="loading" variant="table" embedded />
      <template v-else>
        <div v-if="workLogRows.length" data-testid="desktop-table" class="workbench-table-wrap max-md:hidden">
          <table class="workbench-table">
            <colgroup>
              <col class="workbench-col-date">
              <col class="workbench-col-type">
              <col class="workbench-col-item">
              <col class="workbench-col-desc">
              <col class="workbench-col-hours">
              <col class="workbench-col-total">
            </colgroup>
            <thead>
              <tr>
                <th>日期</th>
                <th>类型</th>
                <th>工作项</th>
                <th>说明</th>
                <th class="text-right">工时</th>
                <th class="text-right">总工时</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in workLogRows" :key="`${row.type}-${row.id}`">
                <td
                  v-if="row.showDate"
                  :rowspan="row.dateRowSpan"
                  class="workbench-table__date align-middle whitespace-nowrap"
                >
                  {{ row.date }}
                </td>
                <td class="whitespace-nowrap">
                  <el-tag :type="typeTagTypes[row.type]" effect="light">
                    {{ typeLabels[row.type] }}
                  </el-tag>
                </td>
                <td>
                  <div class="min-w-0 font-medium text-[var(--pc-text)] break-words">{{ row.item_title }}</div>
                  <div class="mt-0.5 truncate text-[12px] text-[var(--pc-text-muted)]">{{ row.project_name }}</div>
                </td>
                <td class="text-[var(--pc-text-secondary)]">
                  <div class="line-clamp-2 break-words">{{ row.description || '—' }}</div>
                </td>
                <td class="whitespace-nowrap text-right tabular-nums text-[var(--pc-text)]">
                  {{ Number(row.hours).toFixed(1) }}h
                </td>
                <td
                  v-if="row.showDate"
                  :rowspan="row.dateRowSpan"
                  class="align-middle whitespace-nowrap text-right"
                >
                  <strong
                    data-testid="workbench-daily-total"
                    class="font-semibold text-[var(--pc-action)]"
                  >
                    {{ (dailyHours[row.date] || 0).toFixed(1) }}h
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="workLogRows.length" class="hidden gap-0 max-md:grid">
          <article
            v-for="log in workLogRows"
            :key="`m-${log.type}-${log.id}`"
            class="flex items-start justify-between gap-3 border-t border-[var(--pc-border-soft)] px-4 py-3.5"
          >
            <div class="min-w-0">
              <div class="mb-1.5 flex items-center gap-2">
                <el-tag :type="typeTagTypes[log.type]" effect="light">
                  {{ typeLabels[log.type] }}
                </el-tag>
                <span class="text-[12px] text-[var(--pc-text-muted)]">{{ log.date }}</span>
              </div>
              <strong class="block text-[15px] font-semibold tracking-[-0.01em] text-[var(--pc-text)]">{{ log.item_title }}</strong>
              <span class="mt-1 block text-[12px] text-[var(--pc-text-muted)]">{{ log.project_name }}</span>
              <span v-if="log.description" class="mt-1 block text-[12px] text-[var(--pc-text-secondary)]">{{ log.description }}</span>
            </div>
            <b class="shrink-0 text-[15px] font-semibold text-[var(--pc-action)]">{{ Number(log.hours).toFixed(1) }}h</b>
          </article>
        </div>

        <EmptyState
          v-else
          title="所选日期没有工时记录"
          description="登记任务或缺陷工时后，会显示在这里。"
        />
      </template>
    </section>

    <section class="mb-5">
      <header class="mb-3 flex items-end justify-between gap-4 px-1">
        <h2 class="m-0 font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-[21px] leading-tight font-semibold tracking-[0.01em] text-[var(--pc-text)]">
          我的任务
        </h2>
        <span class="text-[13px] text-[var(--pc-text-muted)]">{{ data?.tasks.length || 0 }} 项</span>
      </header>

      <LoadingSkeleton v-if="loading" variant="list" />
      <template v-else>
        <div v-if="data?.tasks.length" class="grid gap-3">
          <article
            v-for="task in data.tasks"
            :key="task.id"
            data-testid="workbench-task-item"
            class="workbench-card workbench-item group"
            role="button"
            tabindex="0"
            @click="openTask(task)"
            @keydown.enter.self="openTask(task)"
            @keydown.space.self.prevent="openTask(task)"
          >
            <div
              class="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--pc-action)_10%,var(--pc-surface))] text-[var(--pc-action)]"
              aria-hidden="true"
            >
              <el-icon :size="18"><Document /></el-icon>
            </div>
            <div class="min-w-0 flex-1 overflow-hidden">
              <div class="flex w-fit max-w-full min-w-0 items-center gap-2">
                <strong class="min-w-0 truncate text-[15px] leading-5 font-semibold tracking-[-0.01em] text-[var(--pc-text)]">
                  {{ task.item_code ? `${task.item_code} · ` : '' }}{{ task.title }}
                </strong>
                <span class="shrink-0">
                  <StatusTag :status="task.status" />
                </span>
              </div>
              <p class="mt-1 mb-0 truncate text-[12px] leading-4 text-[var(--pc-text-muted)]">
                {{ task.project_name }}
                <template v-if="task.sprint_name"> · {{ task.sprint_name }}</template>
                · 优先级: {{ priorityLabel(task.priority) }}
                · 已登记 {{ taskHours(task).toFixed(1) }}h
              </p>
            </div>
            <div class="flex shrink-0 gap-1">
              <button
                type="button"
                class="workbench-icon-btn"
                data-testid="workbench-task-edit"
                aria-label="编辑任务"
                @click.stop="openTask(task)"
              >
                <el-icon><Edit /></el-icon>
              </button>
              <button
                type="button"
                class="workbench-icon-btn"
                data-testid="workbench-task-worklog"
                aria-label="登记任务工时"
                @click.stop="openTask(task, 'time')"
              >
                <el-icon><Clock /></el-icon>
              </button>
              <button
                type="button"
                class="workbench-icon-btn"
                aria-label="打开看板"
                @click.stop="goBoard(task.project_id, task.sprint_id)"
              >
                <el-icon><Link /></el-icon>
              </button>
            </div>
          </article>
        </div>
        <div v-else class="workbench-card">
          <EmptyState
            title="没有待办任务"
            description="分配给你的待处理和进行中任务会显示在这里。"
          />
        </div>
      </template>
    </section>

    <section>
      <header class="mb-3 flex items-end justify-between gap-4 px-1">
        <h2 class="m-0 font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-[21px] leading-tight font-semibold tracking-[0.01em] text-[var(--pc-text)]">
          我的缺陷
        </h2>
        <span class="text-[13px] text-[var(--pc-text-muted)]">{{ data?.bugs.length || 0 }} 项</span>
      </header>

      <LoadingSkeleton v-if="loading" variant="list" />
      <template v-else>
        <div v-if="data?.bugs.length" class="grid gap-3">
          <article
            v-for="bug in data.bugs"
            :key="bug.id"
            data-testid="workbench-bug-item"
            class="workbench-card workbench-item group"
            role="button"
            tabindex="0"
            @click="openBug(bug)"
            @keydown.enter.self="openBug(bug)"
            @keydown.space.self.prevent="openBug(bug)"
          >
            <div
              class="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--pc-danger)_10%,var(--pc-surface))] text-[var(--pc-danger)]"
              aria-hidden="true"
            >
              <el-icon :size="18"><WarningFilled /></el-icon>
            </div>
            <div class="min-w-0 flex-1 overflow-hidden">
              <div class="flex w-fit max-w-full min-w-0 items-center gap-2">
                <strong class="min-w-0 truncate text-[15px] leading-5 font-semibold tracking-[-0.01em] text-[var(--pc-text)]">
                  {{ bug.item_code ? `${bug.item_code} · ` : '' }}{{ bug.title }}
                </strong>
                <span class="shrink-0">
                  <StatusTag :status="bug.status" :label="bugStatusLabels[bug.status]" />
                </span>
              </div>
              <p class="mt-1 mb-0 truncate text-[12px] leading-4 text-[var(--pc-text-muted)]">
                {{ bug.project_name }}
                · 严重度: S{{ bug.severity }}
                · 已登记 {{ bugHours(bug).toFixed(1) }}h
              </p>
            </div>
            <div class="flex shrink-0 gap-1">
              <button
                type="button"
                class="workbench-icon-btn"
                data-testid="workbench-bug-edit"
                aria-label="编辑缺陷"
                @click.stop="openBug(bug)"
              >
                <el-icon><Edit /></el-icon>
              </button>
              <button
                type="button"
                class="workbench-icon-btn"
                data-testid="workbench-bug-worklog"
                aria-label="登记缺陷工时"
                @click.stop="openBug(bug, 'time')"
              >
                <el-icon><Clock /></el-icon>
              </button>
            </div>
          </article>
        </div>
        <div v-else class="workbench-card">
          <EmptyState
            title="没有待办缺陷"
            description="由你负责或报告的未终结缺陷会显示在这里。"
          />
        </div>
      </template>
    </section>

    <IssueDetailDialog
      v-model="issueOpen"
      :issue-id="selectedIssueId"
      :requirements="requirements"
      :users="users"
      :initial-tab="issueTab"
      @changed="load"
    />
    <BugDetailDialog
      v-model="bugOpen"
      :bug-id="selectedBugId"
      :requirements="requirements"
      :sprints="sprints"
      :users="users"
      :initial-tab="bugTab"
      @changed="load"
    />
  </div>
</template>

<style scoped>
.workbench {
  background: transparent;
}

.workbench :deep(.el-empty) {
  padding: 28px 16px 36px;
}

.workbench-card {
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-card);
  background: var(--pc-surface);
}

.workbench-table-wrap {
  overflow-x: auto;
}

.workbench-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  table-layout: fixed;
}

.workbench-col-date {
  width: 112px;
}

.workbench-col-type {
  width: 88px;
}

.workbench-col-item {
  width: auto;
  min-width: 180px;
}

.workbench-col-desc {
  width: 160px;
}

.workbench-col-hours {
  width: 80px;
}

.workbench-col-total {
  width: 100px;
}

.workbench-table th,
.workbench-table td {
  padding: 14px 16px;
  border-top: 1px solid var(--pc-border-soft);
  font-size: 13px;
  text-align: left;
  vertical-align: top;
}

.workbench-table thead th {
  padding-top: 10px;
  padding-bottom: 10px;
  border-top: 0;
  background: var(--pc-surface-soft);
  color: var(--pc-text-muted);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.workbench-table tbody td {
  color: var(--pc-text-secondary);
}

.workbench-table__date {
  color: var(--pc-text);
  font-weight: 500;
}

.workbench-item {
  display: flex;
  min-width: 0;
  min-height: 72px;
  cursor: pointer;
  align-items: center;
  gap: 14px;
  overflow: hidden;
  padding: 16px 20px;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.workbench-item:hover {
  border-color: color-mix(in srgb, var(--pc-action) 28%, var(--pc-border-soft));
  background: color-mix(in srgb, var(--pc-action) 2%, var(--pc-surface));
}

.workbench-icon-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--pc-text-muted);
  transition: color 160ms ease, background-color 160ms ease;
}

.workbench-icon-btn:hover {
  background: var(--pc-surface-soft);
  color: var(--pc-text);
}

@media (max-width: 767px) {
  .workbench-item {
    padding: 14px 16px;
  }
}
</style>
