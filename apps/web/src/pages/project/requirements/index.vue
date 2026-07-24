<script setup lang="ts">
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { getRequirements, getRequirementStats } from '@/api/requirements'
import { apiErrorMessage } from '@/api/client'
import type { Requirement } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import PageHeader from '@/components/page-header.vue'
import StatCard from '@/components/stat-card.vue'
import StatusTag from '@/components/status-tag.vue'
import RequirementDialog from '@/components/business/requirement-dialog.vue'
import RequirementDetailDialog from '@/components/business/requirement-detail-dialog.vue'
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

const hasFilters = computed(() => Boolean(filters.search || filters.status || filters.priority))

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
  selectedRequirementId.value = item.id
  detailOpen.value = true
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-[1440px] p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader :title="`${details?.project.name || '项目'} · 需求`" description="从提出、实现到验收，集中追踪每一项产品需求。">
      <el-button type="primary" data-testid="create-requirement-button" @click="createOpen = true">
        <el-icon><Plus /></el-icon>新建需求
      </el-button>
    </PageHeader>

    <section class="mb-5 grid grid-cols-4 gap-[17px] max-[1000px]:grid-cols-2 max-[600px]:grid-cols-1">
      <StatCard label="全部需求" :value="stats.total" />
      <StatCard label="待规划" :value="stats.pending" />
      <StatCard label="进行与测试" :value="stats.in_progress + stats.testing" />
      <StatCard label="已完成" :value="stats.completed" />
    </section>

    <section class="rounded-[var(--pc-radius-card)] border border-[var(--pc-border-soft)] bg-[var(--pc-surface)] p-6 max-md:rounded-[var(--pc-radius-lg)] max-md:p-[17px]">
      <div class="mb-6 grid grid-cols-[minmax(260px,2fr)_repeat(2,minmax(170px,1fr))_auto] items-end gap-[17px] max-[1000px]:grid-cols-2 max-[600px]:grid-cols-1">
        <el-input v-model="filters.search" clearable placeholder="搜索标题或内容" @keyup.enter="load" @clear="load">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filters.status" clearable placeholder="全部状态" @change="load">
          <el-option label="待规划" value="pending" />
          <el-option label="进行中" value="in_progress" />
          <el-option label="测试中" value="testing" />
          <el-option label="已完成" value="completed" />
        </el-select>
        <el-select v-model="filters.priority" clearable placeholder="全部优先级" @change="load">
          <el-option v-for="level in 5" :key="level" :label="`P${level}`" :value="level" />
        </el-select>
        <el-button @click="load">
          查询
        </el-button>
      </div>

      <div v-loading="loading" class="min-h-[300px]">
        <div v-if="requirements.length" data-testid="desktop-table" class="max-md:hidden">
          <el-table :data="requirements" @row-click="openRequirement">
            <el-table-column label="需求" min-width="300">
              <template #default="{ row }">
                <div class="grid gap-1">
                  <strong class="text-[15px] font-semibold">{{ row.title }}</strong>
                  <span class="text-[13px] text-[var(--pc-text-secondary)]">{{ row.content }}</span>
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
          </el-table>
        </div>

        <div class="hidden gap-3 max-md:grid">
          <article v-for="item in requirements" :key="item.id" class="grid gap-2.5 rounded-[8px] border border-[var(--pc-border-soft)] bg-[var(--pc-surface)] p-[17px]" role="button" tabindex="0" @click="openRequirement(item)" @keydown.enter="openRequirement(item)">
            <header class="flex justify-between gap-3">
              <span class="text-xs font-semibold text-[var(--pc-action)]">P{{ item.priority }}</span>
              <StatusTag :status="item.status" />
            </header>
            <strong class="text-[15px] font-semibold">{{ item.title }}</strong>
            <p class="m-0 line-clamp-2 text-[13px] text-[var(--pc-text-secondary)]">{{ item.content }}</p>
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
  </div>
</template>
