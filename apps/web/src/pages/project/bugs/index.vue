<script setup lang="ts">
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { getBugs, getBugStats } from '@/api/bugs'
import { getRequirements } from '@/api/requirements'
import { getUsers } from '@/api/users'
import { apiErrorMessage } from '@/api/client'
import type { Bug, Requirement, User } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import OverflowTooltip from '@/components/overflow-tooltip.vue'
import PageHeader from '@/components/page-header.vue'
import StatCard from '@/components/stat-card.vue'
import StatusTag from '@/components/status-tag.vue'
import BugDialog from '@/components/business/bug-dialog.vue'
import BugDetailDialog from '@/components/business/bug-detail-dialog.vue'
import { bugStatusLabels } from '@/shared/bug'
import { useProjectContext } from '@/shared/use-project-context'

interface BugStats {
  total: number
  open: number
  in_progress: number
  fixed: number
  closed: number
  rejected: number
}

const { projectId, details, loadProject } = useProjectContext()
const loading = ref(true)
const bugs = ref<Bug[]>([])
const users = ref<User[]>([])
const requirements = ref<Requirement[]>([])
const stats = reactive<BugStats>({ total: 0, open: 0, in_progress: 0, fixed: 0, closed: 0, rejected: 0 })
const filters = reactive({
  search: '',
  status: '',
  severity: '' as number | '',
  assignee_id: '' as number | 'unassigned' | '',
})
const createOpen = ref(false)
const detailOpen = ref(false)
const selectedBugId = ref<number | null>(null)
const hasFilters = computed(() => Boolean(filters.search || filters.status || filters.severity || filters.assignee_id))

async function load() {
  loading.value = true
  try {
    await loadProject()
    const [list, counts, people, requirementList] = await Promise.all([
      getBugs(projectId.value, {
        search: filters.search.trim() || undefined,
        status: filters.status || undefined,
        severity: filters.severity || undefined,
        assignee_id: filters.assignee_id || undefined,
      }),
      getBugStats(projectId.value),
      getUsers(),
      getRequirements(projectId.value),
    ])
    bugs.value = list
    users.value = people
    requirements.value = requirementList
    Object.assign(stats, counts)
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载缺陷失败'))
  }
  finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.assign(filters, { search: '', status: '', severity: '', assignee_id: '' })
  void load()
}

function openBug(item: Bug) {
  selectedBugId.value = item.id
  detailOpen.value = true
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-[1440px] p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader :title="`${details?.project.name || '项目'} · 缺陷`" description="记录、分派并验证缺陷，保留复现过程、证据与工时。">
      <el-button type="primary" data-testid="create-bug-button" @click="createOpen = true">
        <el-icon><Plus /></el-icon>新建缺陷
      </el-button>
    </PageHeader>

    <section class="mb-4 grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2">
      <StatCard label="全部缺陷" :value="stats.total" />
      <StatCard label="待处理" :value="stats.open" />
      <StatCard label="处理中" :value="stats.in_progress" />
      <StatCard label="已修复/关闭" :value="stats.fixed + stats.closed" />
    </section>

    <section>
      <div class="pc-filter-bar max-lg:flex-wrap">
        <div class="min-w-[260px] max-w-[340px] flex-[1_1_300px] max-lg:max-w-none max-lg:basis-full">
          <el-input v-model="filters.search" clearable placeholder="搜索编号、标题或描述" @keyup.enter="load" @clear="load">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </div>
        <div class="w-[160px] shrink-0 max-lg:min-w-[145px] max-lg:flex-1">
          <el-select v-model="filters.status" class="w-full" clearable placeholder="全部状态" @change="load">
            <el-option label="待处理" value="open" />
            <el-option label="处理中" value="in_progress" />
            <el-option label="已修复" value="fixed" />
            <el-option label="已关闭" value="closed" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </div>
        <div class="w-[170px] shrink-0 max-lg:min-w-[150px] max-lg:flex-1">
          <el-select v-model="filters.severity" class="w-full" clearable placeholder="全部严重程度" @change="load">
            <el-option v-for="level in 5" :key="level" :label="`S${level}`" :value="level" />
          </el-select>
        </div>
        <div class="w-[180px] shrink-0 max-lg:min-w-[160px] max-lg:flex-1">
          <el-select v-model="filters.assignee_id" class="w-full" filterable clearable placeholder="全部负责人" @change="load">
            <el-option label="未分配" value="unassigned" />
            <el-option v-for="user in users" :key="user.id" :label="user.username" :value="user.id" />
          </el-select>
        </div>
        <el-button @click="load">
          查询
        </el-button>
        <span class="ml-auto shrink-0 text-xs text-[var(--pc-text-muted)] max-lg:ml-0">{{ bugs.length }} 条缺陷</span>
      </div>

      <div v-loading="loading" class="pc-data-panel max-md:border-0">
        <div v-if="bugs.length" data-testid="desktop-table" class="max-md:hidden">
          <el-table :data="bugs" @row-click="openBug">
            <el-table-column prop="item_code" label="编号" width="110">
              <template #default="{ row }">{{ row.item_code || `BUG-${row.id}` }}</template>
            </el-table-column>
            <el-table-column label="缺陷" min-width="280">
              <template #default="{ row }">
                <div class="grid min-w-0 gap-1">
                  <strong class="truncate text-[15px] font-semibold">{{ row.title }}</strong>
                  <OverflowTooltip
                    :content="row.description"
                    testid="bug-description-overflow"
                    class="text-[13px] text-[var(--pc-text-secondary)]"
                  />
                </div>
              </template>
            </el-table-column>
            <el-table-column label="严重程度" width="110">
              <template #default="{ row }"><span class="text-xs font-semibold text-[var(--pc-danger)]">S{{ row.severity }}</span></template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }"><StatusTag :status="row.status" :label="bugStatusLabels[row.status as Bug['status']]" /></template>
            </el-table-column>
            <el-table-column prop="assignee_name" label="负责人" width="120">
              <template #default="{ row }">{{ row.assignee_name || '未分配' }}</template>
            </el-table-column>
            <el-table-column prop="sprint_name" label="迭代" min-width="140">
              <template #default="{ row }">{{ row.sprint_name || '未规划' }}</template>
            </el-table-column>
            <el-table-column label="证据" width="80">
              <template #default="{ row }">{{ row.evidence_count || 0 }}</template>
            </el-table-column>
            <el-table-column label="工时" width="90">
              <template #default="{ row }">{{ row.time_spent || 0 }}h</template>
            </el-table-column>
            <el-table-column label="操作" width="80" fixed="right" align="center">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  data-testid="bug-detail-action"
                  @click.stop="openBug(row)"
                >
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="hidden gap-3 max-md:grid">
          <article v-for="item in bugs" :key="item.id" class="grid gap-2.5 rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-3.5" role="button" tabindex="0" @click="openBug(item)" @keydown.enter.self="openBug(item)" @keydown.space.self.prevent="openBug(item)">
            <header class="flex items-center justify-between gap-3 text-[13px] text-[var(--pc-text-secondary)]">
              <span>{{ item.item_code || `BUG-${item.id}` }}</span>
              <StatusTag :status="item.status" :label="bugStatusLabels[item.status]" />
            </header>
            <strong class="text-[15px] font-semibold">{{ item.title }}</strong>
            <p class="m-0 line-clamp-2 text-[13px] text-[var(--pc-text-secondary)]">{{ item.description }}</p>
            <footer class="flex items-center justify-between gap-3 text-[13px] text-[var(--pc-text-secondary)]">
              <span class="text-xs font-semibold text-[var(--pc-danger)]">S{{ item.severity }}</span>
              <span>{{ item.assignee_name || '未分配' }}</span>
              <span>{{ item.evidence_count || 0 }} 条证据</span>
            </footer>
          </article>
        </div>

        <EmptyState v-if="!loading && !bugs.length" :title="hasFilters ? '没有匹配的缺陷' : '还没有缺陷'" :description="hasFilters ? '调整筛选条件后再试。' : '当前项目暂无缺陷，可以从这里记录第一个问题。'">
          <el-button v-if="hasFilters" @click="resetFilters">
            清除筛选
          </el-button>
          <el-button v-else type="primary" @click="createOpen = true">
            新建缺陷
          </el-button>
        </EmptyState>
      </div>
    </section>

    <BugDialog
      v-model="createOpen"
      :project-id="projectId"
      :requirements="requirements"
      :sprints="details?.sprints || []"
      :users="users"
      @saved="load"
    />
    <BugDetailDialog
      v-model="detailOpen"
      :bug-id="selectedBugId"
      :requirements="requirements"
      :sprints="details?.sprints || []"
      :users="users"
      @changed="load"
    />
  </div>
</template>
