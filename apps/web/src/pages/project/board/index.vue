<script setup lang="ts">
import { ArrowRight, Plus, Refresh, Tickets } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref, toRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { updateBug } from '@/api/bugs'
import { updateIssue } from '@/api/issues'
import { getProjectBoard } from '@/api/projects'
import { getRequirements } from '@/api/requirements'
import { updateSprint } from '@/api/sprints'
import { getUsers } from '@/api/users'
import { apiErrorMessage } from '@/api/client'
import type { BoardItem, BoardResponse, Requirement, Sprint, Swimlane, User } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import PageHeader from '@/components/page-header.vue'
import StatusTag from '@/components/status-tag.vue'
import BugDialog from '@/components/business/bug-dialog.vue'
import BugDetailDialog from '@/components/business/bug-detail-dialog.vue'
import IssueDialog from '@/components/business/issue-dialog.vue'
import IssueDetailDialog from '@/components/business/issue-detail-dialog.vue'
import SortableBoardColumn from '@/components/business/board/sortable-board-column.vue'
import {
  BOARD_HIDE_COMPLETED_STORAGE_KEY,
  boardBugStatus,
  boardCollapsedStorageKey,
  boardLaneId,
  calculateBoardTotals,
  type BoardStatus,
} from '@/shared/board'
import { useProjectContext } from '@/shared/use-project-context'
import { useAuthStore } from '@/stores/auth'

const statusColumns: Array<{ value: BoardStatus; label: string }> = [
  { value: 'todo', label: '待处理' },
  { value: 'doing', label: '进行中' },
  { value: 'done', label: '已完成' },
]
const sprintStatusLabels: Record<Sprint['status'], string> = {
  open: '未开始',
  active: '进行中',
  closed: '已完成',
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { projectId, organizationId, details, loadProject } = useProjectContext()
const loading = ref(true)
const board = ref<BoardResponse | null>(null)
const users = ref<User[]>([])
const requirements = ref<Requirement[]>([])
const selectedSprintId = ref<number | null>(null)
const hideCompleted = ref(localStorage.getItem(BOARD_HIDE_COMPLETED_STORAGE_KEY) === 'true')
const collapsed = ref(new Set<string>())
const createIssueOpen = ref(false)
const createBugOpen = ref(false)
const issueDialogOpen = ref(false)
const bugDialogOpen = ref(false)
const selectedRequirementId = ref<number | null>(null)
const selectedIssueId = ref<number | null>(null)
const selectedBugId = ref<number | null>(null)

const swimlanes = computed(() => board.value?.swimlanes || [])
const laneOptions = computed(() => swimlanes.value.map(lane => ({
  id: laneId(lane),
  label: lane.requirement?.title || '未分类',
})))
const sprint = computed(() => board.value?.sprint || null)
const totals = computed(() => {
  return calculateBoardTotals(swimlanes.value)
})

function laneId(lane: Swimlane) {
  return boardLaneId(lane)
}

function collapseStorageKey() {
  return boardCollapsedStorageKey(
    auth.user?.id || 'anonymous',
    projectId.value,
    selectedSprintId.value || 0,
  )
}

function readCollapsed() {
  try {
    const stored = JSON.parse(localStorage.getItem(collapseStorageKey()) || '[]')
    collapsed.value = new Set(Array.isArray(stored) ? stored : [])
  }
  catch {
    collapsed.value = new Set()
  }
}

async function loadBoard(sprintId = selectedSprintId.value) {
  const result = await getProjectBoard(projectId.value, sprintId || undefined)
  board.value = result
  if (result.sprint?.id) {
    selectedSprintId.value = result.sprint.id
    readCollapsed()
    if (String(route.query.sprint || '') !== String(result.sprint.id))
      await router.replace({ query: { ...route.query, sprint: String(result.sprint.id) } })
  }
}

async function load() {
  loading.value = true
  try {
    await loadProject()
    const requestedSprint = Number(route.query.sprint || 0) || undefined
    const [people, requirementList] = await Promise.all([
      getUsers(),
      getRequirements(projectId.value),
    ])
    users.value = people
    requirements.value = requirementList
    selectedSprintId.value = requestedSprint || null
    await loadBoard(requestedSprint)
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载看板失败'))
  }
  finally {
    loading.value = false
  }
}

async function changeSprint(value: number) {
  selectedSprintId.value = value
  loading.value = true
  try {
    await router.replace({ query: { ...route.query, sprint: String(value) } })
    await loadBoard(value)
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '切换迭代失败'))
  }
  finally {
    loading.value = false
  }
}

async function updateSprintStatus(status: Sprint['status']) {
  if (!sprint.value)
    return
  try {
    await updateSprint(sprint.value.id, { status })
    ElMessage.success('迭代状态已更新')
    await Promise.all([loadProject(), loadBoard(sprint.value.id)])
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '更新迭代状态失败'))
  }
}

function toggleHideCompleted(value: boolean) {
  hideCompleted.value = value
  localStorage.setItem(BOARD_HIDE_COMPLETED_STORAGE_KEY, String(value))
}

function toggleLane(id: string) {
  const next = new Set(collapsed.value)
  if (next.has(id))
    next.delete(id)
  else
    next.add(id)
  collapsed.value = next
  localStorage.setItem(collapseStorageKey(), JSON.stringify([...next]))
}

function createIssue(requirementId: number | null = null) {
  selectedRequirementId.value = requirementId
  createIssueOpen.value = true
}

function openItem(item: BoardItem) {
  if (item.item_type === 'bug') {
    selectedBugId.value = item.id
    bugDialogOpen.value = true
  }
  else {
    selectedIssueId.value = item.id
    issueDialogOpen.value = true
  }
}

async function moveItem(payload: {
  itemId: number
  itemType: 'task' | 'bug'
  status: BoardStatus
  requirementId: number | null
  sourceStatus: BoardStatus
  sourceLaneId: string
  oldIndex?: number
  newIndex?: number
}) {
  if (!board.value?.swimlanes)
    return
  const snapshot = structuredClone(toRaw(board.value))
  const lanes = board.value.swimlanes
  const targetLane = lanes.find(lane => (
    (lane.requirement?.id || null) === payload.requirementId
  ))
  let moving: BoardItem | undefined
  for (const lane of lanes) {
    for (const status of statusColumns.map(column => column.value)) {
      const index = lane[status].findIndex(item => (
        item.id === payload.itemId && item.item_type === payload.itemType
      ))
      if (index >= 0) {
        moving = lane[status].splice(index, 1)[0]
        break
      }
    }
    if (moving)
      break
  }
  if (!moving || !targetLane) {
    board.value = snapshot
    await loadBoard()
    return
  }

  moving.requirement_id = payload.requirementId
  moving.requirement_title = targetLane.requirement?.title || null
  if (moving.item_type === 'bug') {
    moving.board_status = payload.status
    moving.status = boardBugStatus[payload.status]
  }
  else {
    moving.status = payload.status
  }
  const targetItems = targetLane[payload.status]
  const targetIndex = payload.newIndex == null
    ? targetItems.length
    : Math.min(payload.newIndex, targetItems.length)
  targetItems.splice(targetIndex, 0, moving)

  const metadataChanged = payload.sourceStatus !== payload.status
    || payload.sourceLaneId !== laneId(targetLane)
  if (!metadataChanged)
    return

  try {
    if (payload.itemType === 'bug') {
      await updateBug(payload.itemId, {
        status: boardBugStatus[payload.status],
        requirement_id: payload.requirementId,
      })
    }
    else {
      await updateIssue(payload.itemId, {
        status: payload.status,
        requirement_id: payload.requirementId,
      })
    }
  }
  catch (error) {
    board.value = snapshot
    ElMessage.error(apiErrorMessage(error, '移动工作项失败'))
    await loadBoard()
  }
}

onMounted(load)
</script>

<template>
  <div class="w-full p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader :title="sprint?.name || `${details?.project.name || '项目'} · 看板`" description="按需求泳道推进任务与缺陷，拖动卡片即可更新状态和所属需求。">
      <el-select
        v-if="details?.sprints.length"
        :model-value="selectedSprintId"
        class="w-[220px] max-[800px]:w-full"
        placeholder="选择迭代"
        @change="changeSprint"
      >
        <el-option v-for="item in details.sprints" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-button :loading="loading" @click="loadBoard()">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
      <el-dropdown split-button type="primary" data-testid="create-issue-button" @click="createIssue()" @command="createBugOpen = true">
        <el-icon><Plus /></el-icon>新建任务
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="bug">
              新建缺陷
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </PageHeader>

    <div v-loading="loading">
      <EmptyState
        v-if="!loading && board && !board.has_sprint"
        title="暂无可用迭代"
        :description="board.error || '请先创建或激活一个迭代，再开始使用看板。'"
      >
        <el-button type="primary" @click="router.push(`/organizations/${organizationId}/projects/${projectId}/sprints`)">
          前往迭代
        </el-button>
      </EmptyState>

      <template v-else-if="sprint">
        <section class="mb-[17px] flex items-center gap-5 rounded-[8px] border border-[var(--pc-border-soft)] bg-[var(--pc-surface)] px-[17px] py-3.5 max-[800px]:flex-col max-[800px]:items-start">
          <div class="flex items-center gap-2.5">
            <span class="text-[13px] text-[var(--pc-text-secondary)]">迭代状态</span>
            <el-dropdown @command="updateSprintStatus($event as Sprint['status'])">
              <button type="button" class="cursor-pointer border-0 bg-transparent p-0" data-testid="board-sprint-status-trigger">
                <StatusTag :status="sprint.status" :label="sprintStatusLabels[sprint.status]" />
              </button>
              <template #dropdown>
                <el-dropdown-menu data-testid="board-sprint-status-menu">
                  <el-dropdown-item v-for="(label, value) in sprintStatusLabels" :key="value" :command="value" :disabled="value === sprint.status">
                    {{ label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="flex flex-1 flex-wrap items-center gap-2.5 text-[13px] text-[var(--pc-text-secondary)] max-[800px]:w-full">
            <span class="whitespace-nowrap"><b class="font-semibold text-[var(--pc-text)]">{{ swimlanes.length }}</b> 泳道</span>
            <span class="whitespace-nowrap"><b class="font-semibold text-[var(--pc-text)]">{{ totals.items }}</b> 工作项</span>
            <span class="whitespace-nowrap"><b class="font-semibold text-[var(--pc-text)]">{{ totals.hours }}</b> 小时</span>
            <span class="whitespace-nowrap"><b class="font-semibold text-[var(--pc-text)]">{{ totals.progress }}%</b> 完成</span>
          </div>
          <label class="flex items-center gap-2.5 whitespace-nowrap">
            <span class="text-[13px] text-[var(--pc-text-secondary)]">隐藏已完成</span>
            <el-switch
              :model-value="hideCompleted"
              data-testid="board-hide-completed-toggle"
              aria-label="隐藏已完成卡片"
              @change="toggleHideCompleted(Boolean($event))"
            />
          </label>
        </section>

        <section class="mb-[17px] rounded-[8px] border border-[var(--pc-border-soft)] bg-[var(--pc-surface)] px-[17px] py-3.5">
          <div class="mb-2 flex items-center justify-between gap-2.5">
            <span class="text-[13px] text-[var(--pc-text-secondary)]">迭代进度</span>
            <strong class="text-[13px] text-[var(--pc-action)]">{{ totals.progress }}%</strong>
          </div>
          <el-progress :percentage="totals.progress" :show-text="false" :stroke-width="8" />
        </section>

        <div class="grid gap-3.5">
          <article
            v-for="lane in swimlanes"
            :key="laneId(lane)"
            class="overflow-hidden rounded-[8px] border border-[var(--pc-border)] bg-[var(--pc-surface)]"
            :data-testid="`board-swimlane-${laneId(lane)}`"
          >
            <header class="flex min-h-[52px] items-center justify-between gap-3 border-b border-[var(--pc-border-soft)] px-3 py-1.5">
              <button
                type="button"
                class="flex min-h-10 min-w-0 cursor-pointer items-center gap-2 border-0 bg-transparent px-1.5 text-left text-[var(--pc-text)]"
                :data-testid="`board-swimlane-toggle-${laneId(lane)}`"
                :aria-expanded="!collapsed.has(laneId(lane))"
                @click="toggleLane(laneId(lane))"
              >
                <el-icon
                  class="rotate-90 text-[var(--pc-text-muted)] transition-transform duration-[160ms] data-[collapsed=true]:rotate-0"
                  :data-collapsed="collapsed.has(laneId(lane)) || undefined"
                ><ArrowRight /></el-icon>
                <span v-if="lane.requirement" class="text-[11px] font-semibold text-[var(--pc-action)]">P{{ lane.requirement.priority }}</span>
                <strong class="overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap">{{ lane.requirement?.title || '未分类' }}</strong>
                <small class="text-xs whitespace-nowrap text-[var(--pc-text-muted)]">{{ lane.todo.length + lane.doing.length + lane.done.length }} 项</small>
              </button>
              <el-button text size="small" @click="createIssue(lane.requirement?.id || null)">
                <el-icon><Plus /></el-icon>添加任务
              </el-button>
            </header>

            <div v-if="!collapsed.has(laneId(lane))" class="grid grid-cols-[repeat(3,minmax(260px,1fr))] gap-3 overflow-x-auto p-3">
              <section v-for="column in statusColumns" :key="column.value">
                <header class="flex min-h-[34px] items-center gap-[7px] px-1">
                  <span
                    class="h-2 w-2 rounded-full bg-[var(--pc-text-muted)] data-[status=doing]:bg-[var(--pc-action)] data-[status=done]:bg-[var(--pc-success)]"
                    :data-status="column.value"
                  />
                  <strong class="text-xs font-semibold">{{ column.label }}</strong>
                  <small class="text-[11px] text-[var(--pc-text-muted)]">{{ lane[column.value].length }}</small>
                </header>
                <SortableBoardColumn
                  :status="column.value"
                  :lane-id="laneId(lane)"
                  :lane-options="laneOptions"
                  :items="lane[column.value]"
                  :hide-items="column.value === 'done' && hideCompleted"
                  @open="openItem"
                  @move="moveItem"
                />
              </section>
            </div>
          </article>

          <EmptyState v-if="!swimlanes.length" title="迭代中还没有需求泳道" description="创建需求或未分类任务后，它们会出现在这里。">
            <template #icon><el-icon><Tickets /></el-icon></template>
            <el-button type="primary" @click="createIssue()">
              新建任务
            </el-button>
          </EmptyState>
        </div>
      </template>
    </div>

    <IssueDialog
      v-model="createIssueOpen"
      :project-id="projectId"
      :sprint-id="selectedSprintId"
      :requirement-id="selectedRequirementId"
      :requirements="requirements"
      :users="users"
      @saved="loadBoard()"
    />
    <BugDialog
      v-model="createBugOpen"
      :project-id="projectId"
      :sprint-id="selectedSprintId"
      :requirements="requirements"
      :sprints="details?.sprints || []"
      :users="users"
      @saved="loadBoard()"
    />
    <IssueDetailDialog
      v-model="issueDialogOpen"
      :issue-id="selectedIssueId"
      :requirements="requirements"
      :users="users"
      @changed="loadBoard()"
    />
    <BugDetailDialog
      v-model="bugDialogOpen"
      :bug-id="selectedBugId"
      :requirements="requirements"
      :sprints="details?.sprints || []"
      :users="users"
      @changed="loadBoard()"
    />
  </div>
</template>
