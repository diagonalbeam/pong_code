<script setup lang="ts">
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  batchDeleteRequirements,
  getRequirements,
  getRequirementStats,
} from '@/api/requirements'
import { apiErrorMessage } from '@/api/client'
import type { Requirement } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import LoadingSkeleton from '@/components/loading-skeleton.vue'
import MarkdownRenderer from '@/components/markdown-renderer.vue'
import OverflowTooltip from '@/components/overflow-tooltip.vue'
import PageHeader from '@/components/page-header.vue'
import StatCard from '@/components/stat-card.vue'
import StatusTag from '@/components/status-tag.vue'
import RequirementDialog from '@/components/business/requirement-dialog.vue'
import RequirementDetailDialog from '@/components/business/requirement-detail-dialog.vue'
import RequirementBatchBindDialog from '@/components/business/requirement-batch-bind-dialog.vue'
import { useProjectContext } from '@/shared/use-project-context'

interface RequirementStats {
  total: number
  pending: number
  in_progress: number
  testing: number
  completed: number
}

const { projectId, details, loadProject } = useProjectContext()
const loading = ref(true)
const requirements = ref<Requirement[]>([])
const stats = reactive<RequirementStats>({ total: 0, pending: 0, in_progress: 0, testing: 0, completed: 0 })
const filters = reactive({ search: '', status: '', priority: '' as number | '' })
const createOpen = ref(false)
const detailOpen = ref(false)
const selectedRequirementId = ref<number | null>(null)
const multiSelectMode = ref(false)
const selectedIds = ref(new Set<number>())
const batchBindOpen = ref(false)
const batchDeleting = ref(false)

const hasFilters = computed(() => Boolean(filters.search || filters.status || filters.priority))
const selectedCount = computed(() => selectedIds.value.size)
const selectedIdList = computed(() => [...selectedIds.value])

async function load() {
  loading.value = true
  try {
    await loadProject()
    const [list, counts] = await Promise.all([
      getRequirements(projectId.value, {
        search: filters.search.trim() || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
      }),
      getRequirementStats(projectId.value),
    ])
    requirements.value = list
    Object.assign(stats, counts)
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载需求失败'))
  }
  finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.assign(filters, { search: '', status: '', priority: '' })
  void load()
}

function openRequirement(item: Requirement) {
  if (multiSelectMode.value) {
    toggleRequirement(item.id)
    return
  }
  selectedRequirementId.value = item.id
  detailOpen.value = true
}

function toggleRequirement(id: number, checked = !selectedIds.value.has(id)) {
  const next = new Set(selectedIds.value)
  if (checked)
    next.add(id)
  else
    next.delete(id)
  selectedIds.value = next
}

function exitMultiSelect() {
  multiSelectMode.value = false
  selectedIds.value = new Set()
}

function requirementRowClass({ row }: { row: Requirement }) {
  return multiSelectMode.value && selectedIds.value.has(row.id)
    ? 'requirement-row-selected'
    : ''
}

async function batchRemove() {
  const count = selectedCount.value
  if (!count)
    return

  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${count} 个需求吗？需求内的任务及任务工时也会被删除，此操作不可撤销。`,
      '批量删除需求',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
      },
    )
  }
  catch (error) {
    if (error === 'cancel' || error === 'close')
      return
    throw error
  }

  batchDeleting.value = true
  try {
    const result = await batchDeleteRequirements(projectId.value, selectedIdList.value)
    ElMessage.success(`已删除 ${result.deleted_count} 个需求`)
    exitMultiSelect()
    await load()
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '批量删除需求失败'))
  }
  finally {
    batchDeleting.value = false
  }
}

async function handleBatchBound(sprint: { name: string }, count: number) {
  ElMessage.success(`已将 ${count} 个需求绑定到“${sprint.name}”`)
  exitMultiSelect()
  await load()
}

onMounted(load)
</script>

<template>
  <div
    class="mx-auto w-full max-w-[1920px] p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8"
    :class="{ 'pb-28! max-md:pb-32!': multiSelectMode }"
  >
    <PageHeader :title="`${details?.project.name || '项目'} · 需求`" description="从提出、实现到验收，集中追踪每一项产品需求。">
      <el-button
        v-if="stats.total > 0"
        data-testid="requirement-multi-select-button"
        :type="multiSelectMode ? 'primary' : 'default'"
        @click="multiSelectMode ? exitMultiSelect() : multiSelectMode = true"
      >
        {{ multiSelectMode ? '退出多选' : '多选' }}
      </el-button>
      <el-button type="primary" data-testid="create-requirement-button" @click="createOpen = true">
        <el-icon><Plus /></el-icon>新建需求
      </el-button>
    </PageHeader>

    <section class="mb-4 grid grid-cols-4 gap-3 max-[1000px]:grid-cols-2">
      <StatCard label="全部需求" :value="stats.total" tone="warning" />
      <StatCard label="待规划" :value="stats.pending" tone="warning" />
      <StatCard label="进行与测试" :value="stats.in_progress + stats.testing" tone="action" />
      <StatCard label="已完成" :value="stats.completed" tone="success" />
    </section>

    <section>
      <div class="pc-filter-bar max-md:flex-wrap">
        <div class="min-w-[260px] max-w-[420px] flex-[1_1_320px] max-md:max-w-none max-md:basis-full">
          <el-input v-model="filters.search" clearable placeholder="搜索标题或内容" @keyup.enter="load" @clear="load">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </div>
        <div class="w-[200px] shrink-0 max-md:min-w-[160px] max-md:flex-1">
          <el-select v-model="filters.status" class="w-full" clearable placeholder="全部状态" @change="load">
            <el-option label="待规划" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="测试中" value="testing" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </div>
        <div class="w-[180px] shrink-0 max-md:min-w-[160px] max-md:flex-1">
          <el-select v-model="filters.priority" class="w-full" clearable placeholder="全部优先级" @change="load">
            <el-option v-for="level in 5" :key="level" :label="`P${level}`" :value="level" />
          </el-select>
        </div>
        <el-button @click="load">
          查询
        </el-button>
        <span class="ml-auto shrink-0 text-xs text-[var(--pc-text-muted)] max-md:ml-0">{{ requirements.length }} 条需求</span>
      </div>

      <div class="pc-data-panel max-md:border-0">
        <LoadingSkeleton v-if="loading" variant="table" embedded />
        <div v-else-if="requirements.length" data-testid="desktop-table" class="max-md:hidden">
          <el-table
            :data="requirements"
            :row-class-name="requirementRowClass"
            @row-click="openRequirement"
          >
            <el-table-column v-if="multiSelectMode" width="52" align="center">
              <template #default="{ row }">
                <span @click.stop>
                  <el-checkbox
                    :model-value="selectedIds.has(row.id)"
                    :aria-label="`选择需求 ${row.title}`"
                    @change="toggleRequirement(row.id, Boolean($event))"
                  />
                </span>
              </template>
            </el-table-column>
            <el-table-column label="需求" min-width="300">
              <template #default="{ row }">
                <div class="grid min-w-0 gap-1">
                  <strong class="truncate text-[15px] font-semibold">{{ row.title }}</strong>
                  <OverflowTooltip
                    :content="row.content"
                    testid="requirement-content-overflow"
                    markdown
                    class="text-[13px] text-[var(--pc-text-secondary)]"
                  />
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }"><StatusTag :status="row.status" /></template>
            </el-table-column>
            <el-table-column label="优先级" width="90">
              <template #default="{ row }"><span class="text-xs font-semibold text-[var(--pc-action)]">P{{ row.priority }}</span></template>
            </el-table-column>
            <el-table-column prop="sprint_name" label="所属迭代" min-width="150">
              <template #default="{ row }">{{ row.sprint_name || '未规划' }}</template>
            </el-table-column>
            <el-table-column prop="creator_name" label="创建人" width="120" />
            <el-table-column prop="expected_delivery_date" label="期望交付" width="130">
              <template #default="{ row }">{{ row.expected_delivery_date || '-' }}</template>
            </el-table-column>
            <el-table-column v-if="!multiSelectMode" label="操作" width="80" fixed="right" align="center">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  data-testid="requirement-detail-action"
                  @click.stop="openRequirement(row)"
                >
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div v-if="!loading" class="hidden gap-3 max-md:grid">
          <article
            v-for="item in requirements"
            :key="item.id"
            class="grid gap-2.5 rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-3.5 transition-colors"
            :class="{ 'border-[var(--pc-action)]! bg-[color-mix(in_srgb,var(--pc-action)_7%,var(--pc-surface))]!': multiSelectMode && selectedIds.has(item.id) }"
            role="button"
            tabindex="0"
            @click="openRequirement(item)"
            @keydown.enter.self="openRequirement(item)"
            @keydown.space.self.prevent="openRequirement(item)"
          >
            <header class="flex justify-between gap-3">
              <span class="inline-flex items-center gap-2">
                <span v-if="multiSelectMode" @click.stop>
                  <el-checkbox
                    :model-value="selectedIds.has(item.id)"
                    :aria-label="`选择需求 ${item.title}`"
                    @change="toggleRequirement(item.id, Boolean($event))"
                  />
                </span>
                <span class="text-xs font-semibold text-[var(--pc-action)]">P{{ item.priority }}</span>
              </span>
              <StatusTag :status="item.status" />
            </header>
            <strong class="text-[15px] font-semibold">{{ item.title }}</strong>
            <MarkdownRenderer
              :source="item.content"
              compact
              class="line-clamp-2 text-[13px] text-[var(--pc-text-secondary)]"
            />
            <footer class="flex justify-between gap-3 text-[13px] text-[var(--pc-text-secondary)]">
              <span>{{ item.sprint_name || '未规划迭代' }}</span>
              <span>{{ item.expected_delivery_date || '未设置交付日期' }}</span>
            </footer>
          </article>
        </div>

        <EmptyState v-if="!loading && !requirements.length" :title="hasFilters ? '没有匹配的需求' : '还没有需求'" :description="hasFilters ? '调整筛选条件后再试。' : '先创建第一项需求，为迭代和工作项建立目标。'">
          <el-button v-if="hasFilters" @click="resetFilters">
            清除筛选
          </el-button>
          <el-button v-else type="primary" @click="createOpen = true">
            新建需求
          </el-button>
        </EmptyState>
      </div>
    </section>

    <RequirementDialog v-model="createOpen" :project-id="projectId" :sprints="details?.sprints || []" @saved="load" />
    <RequirementDetailDialog v-model="detailOpen" :requirement-id="selectedRequirementId" :sprints="details?.sprints || []" @changed="load" />
    <RequirementBatchBindDialog
      v-model="batchBindOpen"
      :project-id="projectId"
      :requirement-ids="selectedIdList"
      :sprints="details?.sprints || []"
      @bound="handleBatchBound"
    />

    <div
      v-if="multiSelectMode"
      data-testid="requirement-batch-bar"
      class="fixed bottom-5 left-1/2 z-30 flex min-h-14 -translate-x-1/2 items-center gap-3 rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] bg-[var(--pc-surface)] px-4 py-2 shadow-[0_12px_36px_rgb(15_23_42_/_0.18)] max-md:bottom-3 max-md:w-[calc(100%-24px)] max-md:flex-wrap max-md:justify-center"
    >
      <strong class="mr-2 whitespace-nowrap text-sm">已选择 {{ selectedCount }} 项</strong>
      <el-button @click="exitMultiSelect">
        取消
      </el-button>
      <el-button
        type="danger"
        :disabled="selectedCount === 0"
        :loading="batchDeleting"
        data-testid="requirement-batch-delete-button"
        @click="batchRemove"
      >
        批量删除
      </el-button>
      <el-button
        type="primary"
        :disabled="selectedCount === 0"
        data-testid="requirement-batch-bind-button"
        @click="batchBindOpen = true"
      >
        批量绑定迭代
      </el-button>
    </div>
  </div>
</template>

<style scoped>
:deep(.el-table .requirement-row-selected > td.el-table__cell) {
  background: color-mix(in srgb, var(--pc-action) 7%, var(--pc-surface));
}

:deep(.el-table .requirement-row-selected:hover > td.el-table__cell) {
  background: color-mix(in srgb, var(--pc-action) 10%, var(--pc-surface));
}
</style>
