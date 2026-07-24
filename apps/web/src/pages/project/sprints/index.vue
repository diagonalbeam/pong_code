<script setup lang="ts">
import { MoreFilled, Plus, Search, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getRequirements } from '@/api/requirements'
import { getUsers } from '@/api/users'
import { apiErrorMessage } from '@/api/client'
import type { Requirement, Sprint, User } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import PageHeader from '@/components/page-header.vue'
import StatusTag from '@/components/status-tag.vue'
import SprintDialog from '@/components/business/sprint-dialog.vue'
import SprintDetailDialog from '@/components/business/sprint-detail-dialog.vue'
import { useProjectContext } from '@/shared/use-project-context'

const router = useRouter()
const { projectId, organizationId, details, loadProject } = useProjectContext()
const loading = ref(true)
const users = ref<User[]>([])
const requirements = ref<Requirement[]>([])
const search = ref('')
const status = ref('')
const owner = ref<number | ''>('')
const createOpen = ref(false)
const detailOpen = ref(false)
const selectedSprintId = ref<number | null>(null)

const filtered = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return (details.value?.sprints || []).filter(item => (
    (!keyword || item.name.toLowerCase().includes(keyword))
    && (!status.value || item.status === status.value)
    && (!owner.value || item.owner_id === owner.value)
  ))
})

async function load() {
  loading.value = true
  try {
    await loadProject()
    const [userList, requirementList] = await Promise.all([
      getUsers(),
      getRequirements(projectId.value),
    ])
    users.value = userList
    requirements.value = requirementList
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载迭代失败'))
  }
  finally {
    loading.value = false
  }
}

function openSprint(sprint: Sprint) {
  selectedSprintId.value = sprint.id
  detailOpen.value = true
}

function openBoard(sprint: Sprint) {
  void router.push({
    path: `/organizations/${organizationId.value}/projects/${projectId.value}/board`,
    query: { sprint: String(sprint.id) },
  })
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-[1440px] p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader :title="details?.project.name || '全部迭代'" description="查看、筛选和管理项目中的所有迭代。">
      <el-button @click="ElMessage.info('列设置功能开发中')">
        <el-icon><Setting /></el-icon>列设置
      </el-button>
      <el-button type="primary" data-testid="create-sprint-button" @click="createOpen = true">
        <el-icon><Plus /></el-icon>新建迭代
      </el-button>
    </PageHeader>

    <section>
      <div class="pc-filter-bar max-md:flex-wrap">
        <div class="w-full max-w-[360px] max-md:max-w-none max-md:basis-full">
          <el-input v-model="search" clearable placeholder="搜索迭代名称">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </div>
        <div class="w-[200px] shrink-0 max-md:min-w-[160px] max-md:flex-1">
          <el-select v-model="status" class="w-full" clearable placeholder="全部状态">
            <el-option label="未开始" value="open" />
            <el-option label="进行中" value="active" />
            <el-option label="已完成" value="closed" />
          </el-select>
        </div>
        <div class="w-[220px] shrink-0 max-md:min-w-[180px] max-md:flex-1">
          <el-select v-model="owner" class="w-full" clearable filterable placeholder="全部负责人">
            <el-option v-for="user in users" :key="user.id" :label="user.username" :value="user.id" />
          </el-select>
        </div>
        <span class="ml-auto shrink-0 text-xs text-[var(--pc-text-muted)] max-md:ml-0">{{ filtered.length }} 个迭代</span>
      </div>

      <div v-loading="loading" class="pc-data-panel max-md:border-0">
        <div v-if="filtered.length" data-testid="desktop-table" class="max-md:hidden">
          <el-table :data="filtered" @row-click="openBoard">
            <el-table-column prop="name" label="名称" min-width="220" show-overflow-tooltip />
            <el-table-column label="状态" width="110">
              <template #default="{ row }"><StatusTag :status="row.status" :label="row.status_label" /></template>
            </el-table-column>
            <el-table-column label="进度" min-width="180">
              <template #default="{ row }">
                <el-progress :percentage="row.progress" :stroke-width="7" />
              </template>
            </el-table-column>
            <el-table-column prop="category" label="类别" width="130">
              <template #default="{ row }">{{ row.category || '-' }}</template>
            </el-table-column>
            <el-table-column prop="owner_name" label="负责人" width="130">
              <template #default="{ row }">{{ row.owner_name || '-' }}</template>
            </el-table-column>
            <el-table-column label="日期" width="210">
              <template #default="{ row }">{{ row.start_date || '-' }} 至 {{ row.end_date || '-' }}</template>
            </el-table-column>
            <el-table-column label="工时" width="90">
              <template #default="{ row }">{{ row.time_spent }}h</template>
            </el-table-column>
            <el-table-column label="操作" width="72" fixed="right" align="center">
              <template #default="{ row }">
                <button
                  type="button"
                  class="mx-auto grid h-8 w-8 place-items-center rounded-[var(--pc-radius-sm)] border-0 bg-transparent p-0 text-[var(--pc-text-muted)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)]"
                  :aria-label="`编辑迭代 ${row.name}`"
                  @click.stop="openSprint(row)"
                >
                  <el-icon><MoreFilled /></el-icon>
                </button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="hidden gap-3 max-md:grid">
          <article v-for="sprint in filtered" :key="sprint.id" class="grid gap-3 rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-3.5" role="button" tabindex="0" @click="openBoard(sprint)" @keydown.enter.self="openBoard(sprint)" @keydown.space.self.prevent="openBoard(sprint)">
            <header class="flex justify-between gap-3">
              <strong class="text-[15px] font-semibold">{{ sprint.name }}</strong>
              <div class="flex items-center gap-1">
                <StatusTag :status="sprint.status" :label="sprint.status_label" />
                <button
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded-[var(--pc-radius-sm)] border-0 bg-transparent p-0 text-[var(--pc-text-muted)] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)]"
                  :aria-label="`编辑迭代 ${sprint.name}`"
                  @click.stop="openSprint(sprint)"
                >
                  <el-icon><MoreFilled /></el-icon>
                </button>
              </div>
            </header>
            <el-progress :percentage="sprint.progress" :stroke-width="7" />
            <footer class="flex justify-between gap-3 text-xs text-[var(--pc-text-secondary)]">
              <span>{{ sprint.start_date }} 至 {{ sprint.end_date }}</span>
              <span>{{ sprint.owner_name || '未指定负责人' }}</span>
            </footer>
          </article>
        </div>

        <EmptyState v-if="!loading && !filtered.length" :title="details?.sprints.length ? '没有匹配的迭代' : '还没有迭代'" description="创建迭代后开始组织需求和任务。">
          <el-button v-if="!details?.sprints.length" type="primary" @click="createOpen = true">
            新建迭代
          </el-button>
        </EmptyState>
      </div>
    </section>

    <SprintDialog v-model="createOpen" :project-id="projectId" :users="users" @saved="load" />
    <SprintDetailDialog v-model="detailOpen" :sprint-id="selectedSprintId" :users="users" :all-requirements="requirements" @changed="load" />
  </div>
</template>
