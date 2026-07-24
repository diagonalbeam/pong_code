<script setup lang="ts">
import { Clock, Edit, Link } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getProject } from '@/api/projects'
import { getRequirements } from '@/api/requirements'
import { getUsers } from '@/api/users'
import { getWorkbench } from '@/api/workbench'
import { apiErrorMessage } from '@/api/client'
import type { Bug, Issue, Requirement, Sprint, User, WorkbenchResponse } from '@/api/types'
import PageHeader from '@/components/page-header.vue'
import StatCard from '@/components/stat-card.vue'
import BugDetailDialog from '@/components/business/bug-detail-dialog.vue'
import IssueDetailDialog from '@/components/business/issue-detail-dialog.vue'

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

const dailyHours = computed(() => {
  const result: Record<string, number> = {}
  for (const log of data.value?.work_logs || []) {
    if (log.type === 'sprint')
      continue
    result[log.date] = (result[log.date] || 0) + Number(log.hours)
  }
  return result
})

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
  <div class="mx-auto w-full max-w-[1440px] p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader title="工作台" description="集中查看我的待办和工时记录。">
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
    </PageHeader>

    <section class="mb-4 grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:[&>*:last-child]:col-span-2">
      <StatCard label="区间总工时" :value="`${data?.total_hours || 0}h`" hint="包含任务、缺陷和迭代工时" />
      <StatCard label="待办任务" :value="data?.tasks.length || 0" hint="由我负责的待办和进行中任务" />
      <StatCard label="待办缺陷" :value="data?.bugs.length || 0" hint="由我负责或报告的未终结缺陷" />
    </section>

    <div v-loading="loading" class="grid grid-cols-[minmax(320px,0.85fr)_minmax(0,1.35fr)] gap-4 max-lg:grid-cols-1">
      <section class="rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-4">
        <h2 class="mt-0 mb-3 text-lg font-semibold">我的待办</h2>
        <div>
          <h3 class="mt-4 mb-1.5 text-xs font-semibold text-[var(--pc-text-secondary)]">任务</h3>
          <article
            v-for="task in data?.tasks || []"
            :key="task.id"
            data-testid="workbench-task-item"
            class="flex min-h-[60px] cursor-pointer items-center justify-between gap-3 border-b border-[var(--pc-border-soft)] py-2"
            role="button"
            tabindex="0"
            @click="openTask(task)"
            @keydown.enter.self="openTask(task)"
            @keydown.space.self.prevent="openTask(task)"
          >
            <div class="flex min-w-0 flex-col">
              <strong class="overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap">{{ task.item_code ? `${task.item_code} · ` : '' }}{{ task.title }}</strong>
              <span class="mt-[3px] text-xs text-[var(--pc-text-secondary)]">{{ task.project_name }} · {{ task.sprint_name || '未分配迭代' }}</span>
            </div>
            <div class="flex shrink-0 gap-1">
              <button type="button" class="grid h-8 w-8 place-items-center rounded-[var(--pc-radius-sm)] border-0 bg-transparent p-0 text-[var(--pc-text-muted)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)]" data-testid="workbench-task-edit" aria-label="编辑任务" @click.stop="openTask(task)">
                <el-icon><Edit /></el-icon>
              </button>
              <button type="button" class="grid h-8 w-8 place-items-center rounded-[var(--pc-radius-sm)] border-0 bg-transparent p-0 text-[var(--pc-text-muted)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)]" data-testid="workbench-task-worklog" aria-label="登记任务工时" @click.stop="openTask(task, 'time')">
                <el-icon><Clock /></el-icon>
              </button>
              <button type="button" class="grid h-8 w-8 place-items-center rounded-[var(--pc-radius-sm)] border-0 bg-transparent p-0 text-[var(--pc-text-muted)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-action)]" aria-label="打开看板" @click.stop="goBoard(task.project_id, task.sprint_id)">
                <el-icon><Link /></el-icon>
              </button>
            </div>
          </article>
          <el-empty v-if="!data?.tasks.length" :image-size="64" description="没有待办任务" />
        </div>
        <div>
          <h3 class="mt-4 mb-1.5 text-xs font-semibold text-[var(--pc-text-secondary)]">缺陷</h3>
          <article
            v-for="bug in data?.bugs || []"
            :key="bug.id"
            data-testid="workbench-bug-item"
            class="flex min-h-[60px] cursor-pointer items-center justify-between gap-3 border-b border-[var(--pc-border-soft)] py-2"
            role="button"
            tabindex="0"
            @click="openBug(bug)"
            @keydown.enter.self="openBug(bug)"
            @keydown.space.self.prevent="openBug(bug)"
          >
            <div class="flex min-w-0 flex-col">
              <strong class="overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap">{{ bug.item_code ? `${bug.item_code} · ` : '' }}{{ bug.title }}</strong>
              <span class="mt-[3px] text-xs text-[var(--pc-text-secondary)]">{{ bug.project_name }} · 严重度 S{{ bug.severity }}</span>
            </div>
            <div class="flex shrink-0 gap-1">
              <button type="button" class="grid h-8 w-8 place-items-center rounded-[var(--pc-radius-sm)] border-0 bg-transparent p-0 text-[var(--pc-text-muted)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)]" data-testid="workbench-bug-edit" aria-label="编辑缺陷" @click.stop="openBug(bug)">
                <el-icon><Edit /></el-icon>
              </button>
              <button type="button" class="grid h-8 w-8 place-items-center rounded-[var(--pc-radius-sm)] border-0 bg-transparent p-0 text-[var(--pc-text-muted)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)]" data-testid="workbench-bug-worklog" aria-label="登记缺陷工时" @click.stop="openBug(bug, 'time')">
                <el-icon><Clock /></el-icon>
              </button>
            </div>
          </article>
          <el-empty v-if="!data?.bugs.length" :image-size="64" description="没有待办缺陷" />
        </div>
      </section>

      <section class="rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-4">
        <h2 class="mt-0 mb-3 text-lg font-semibold">工时明细</h2>
        <div data-testid="desktop-table" class="max-md:hidden">
          <el-table :data="data?.work_logs || []">
            <el-table-column prop="date" label="日期" width="112" />
            <el-table-column prop="item_title" label="工作项" min-width="180" show-overflow-tooltip />
            <el-table-column prop="project_name" label="项目" min-width="130" show-overflow-tooltip />
            <el-table-column prop="hours" label="工时" width="80">
              <template #default="{ row }">
                {{ row.hours }}h
              </template>
            </el-table-column>
            <el-table-column label="当日任务/缺陷合计" width="150">
              <template #default="{ row }">
                <strong data-testid="workbench-daily-total">{{ (dailyHours[row.date] || 0).toFixed(1) }}h</strong>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="hidden gap-3 max-md:grid">
          <article v-for="log in data?.work_logs || []" :key="`${log.type}-${log.id}`" class="relative rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] p-3">
            <strong class="block pr-[52px] text-sm">{{ log.item_title }}</strong>
            <span class="mt-1 block pr-[52px] text-xs text-[var(--pc-text-secondary)]">{{ log.date }} · {{ log.project_name }}</span>
            <b class="absolute top-3 right-3 text-[var(--pc-action)]">{{ log.hours }}h</b>
          </article>
        </div>
        <el-empty v-if="!loading && !data?.work_logs.length" :image-size="64" description="所选日期没有工时记录" />
      </section>
    </div>

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
