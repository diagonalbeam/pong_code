<script setup lang="ts">
import { ArrowRight, Collection, Delete, Edit, FolderOpened, Plus, Search, Tickets, UserFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrganization } from '@/api/organizations'
import { deleteProject } from '@/api/projects'
import { apiErrorMessage } from '@/api/client'
import type { OrganizationDetails, Project } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import PageHeader from '@/components/page-header.vue'
import ProjectDialog from '@/components/business/project-dialog.vue'
import TeamDialog from '@/components/business/team-dialog.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const organizationId = computed(() => Number(route.params.orgId))
const data = ref<OrganizationDetails | null>(null)
const loading = ref(true)
const search = ref('')
const teamFilter = ref<number | ''>('')
const projectDialogOpen = ref(false)
const teamDialogOpen = ref(false)
const editingProject = ref<Project | null>(null)

const storageKey = computed(() => `pongcode:project-team-filter:${auth.user?.id || 'unknown'}:${organizationId.value}`)
const filteredProjects = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return (data.value?.projects || []).filter(project => (
    (!teamFilter.value || project.team_id === teamFilter.value)
    && (!keyword || project.name.toLowerCase().includes(keyword))
  ))
})

watch(teamFilter, (value) => {
  if (value)
    localStorage.setItem(storageKey.value, String(value))
  else
    localStorage.removeItem(storageKey.value)
})

async function load() {
  loading.value = true
  try {
    const result = await getOrganization(organizationId.value)
    data.value = result
    const saved = Number(localStorage.getItem(storageKey.value))
    teamFilter.value = result.teams.some(team => team.id === saved) ? saved : ''
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载组织失败'))
  }
  finally {
    loading.value = false
  }
}

function createProject() {
  editingProject.value = null
  projectDialogOpen.value = true
}

function editProject(project: Project) {
  editingProject.value = project
  projectDialogOpen.value = true
}

async function removeProject(project: Project) {
  try {
    await ElMessageBox.confirm(
      `删除项目“${project.name}”将同时删除迭代、任务、需求、缺陷、工时和附件，此操作不可恢复。`,
      '确认删除项目',
      { type: 'warning', confirmButtonText: '删除项目' },
    )
    await deleteProject(project.id)
    ElMessage.success('项目已删除')
    await load()
  }
  catch (error) {
    if (error === 'cancel' || error === 'close')
      return
    ElMessage.error(apiErrorMessage(error, '删除项目失败'))
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-[1440px] p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader :title="data?.organization.name || '组织详情'" description="管理组织中的团队、成员和项目。">
      <el-button @click="router.push(`/organizations/${organizationId}/members`)">
        <el-icon><UserFilled /></el-icon>组织成员
      </el-button>
      <el-button @click="router.push(`/organizations/${organizationId}/teams`)">
        团队
      </el-button>
      <el-button v-if="data?.can_manage_projects" type="primary" data-testid="create-project-button" @click="createProject">
        <el-icon><Plus /></el-icon>创建项目
      </el-button>
    </PageHeader>

    <section v-loading="loading" class="min-h-60">
      <div class="pc-filter-bar max-sm:flex-wrap">
        <div class="w-full max-w-[360px] max-sm:max-w-none max-sm:basis-full">
          <el-input v-model="search" clearable placeholder="搜索项目">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="w-[220px] shrink-0 max-sm:min-w-[160px] max-sm:flex-1">
          <el-select v-model="teamFilter" class="w-full" clearable data-testid="project-team-filter" placeholder="全部团队">
            <el-option v-for="team in data?.teams || []" :key="team.id" :label="team.name" :value="team.id" />
          </el-select>
        </div>
        <span class="ml-auto shrink-0 text-xs text-[var(--pc-text-muted)] max-sm:ml-0">
          {{ filteredProjects.length }} 个项目
        </span>
      </div>

      <div v-if="filteredProjects.length" class="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <article
          v-for="project in filteredProjects"
          :key="project.id"
          class="flex min-h-[164px] cursor-pointer flex-col rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-4 transition-[border-color,background-color] duration-[160ms] hover:border-[color-mix(in_srgb,var(--pc-action)_38%,var(--pc-border))] hover:bg-[color-mix(in_srgb,var(--pc-action)_2%,var(--pc-surface))]"
          data-testid="org-project-card"
          :data-project-id="project.id"
          :data-team-id="project.team_id || ''"
          role="button"
          tabindex="0"
          @click="router.push(`/organizations/${organizationId}/projects/${project.id}/sprints`)"
          @keydown.enter.self="router.push(`/organizations/${organizationId}/projects/${project.id}/sprints`)"
          @keydown.space.self.prevent="router.push(`/organizations/${organizationId}/projects/${project.id}/sprints`)"
        >
          <div class="flex items-start gap-3">
            <div class="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--pc-radius-md)] bg-[color-mix(in_srgb,var(--pc-action)_10%,var(--pc-surface))] text-[var(--pc-action)]">
              <el-icon><FolderOpened /></el-icon>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="m-0 truncate text-[17px] leading-5 font-semibold tracking-[-0.01em] text-[var(--pc-text)]">{{ project.name }}</h2>
              <el-tag v-if="project.team_name" class="mt-1 !h-5 !rounded-[var(--pc-radius-sm)] !px-1.5 !text-[11px]" data-testid="project-team-badge" effect="plain">
                {{ project.team_name }}
              </el-tag>
              <p v-else class="mt-1 mb-0 text-xs leading-4 text-[var(--pc-text-muted)]">未分配团队</p>
            </div>
            <div v-if="data?.can_manage_projects" class="flex shrink-0 gap-1">
              <button
                type="button"
                class="grid h-8 w-8 place-items-center rounded-[var(--pc-radius-sm)] border-0 bg-transparent p-0 text-[var(--pc-text-muted)] transition-colors duration-[160ms] hover:bg-[var(--pc-surface-soft)] hover:text-[var(--pc-text)]"
                data-testid="edit-project-button"
                :aria-label="`编辑项目 ${project.name}`"
                @click.stop="editProject(project)"
              >
                <el-icon><Edit /></el-icon>
              </button>
              <button
                type="button"
                class="grid h-8 w-8 place-items-center rounded-[var(--pc-radius-sm)] border-0 bg-transparent p-0 text-[var(--pc-text-muted)] transition-colors duration-[160ms] hover:bg-[color-mix(in_srgb,var(--pc-danger)_8%,var(--pc-surface))] hover:text-[var(--pc-danger)]"
                data-testid="delete-project-button"
                :aria-label="`删除项目 ${project.name}`"
                @click.stop="removeProject(project)"
              >
                <el-icon><Delete /></el-icon>
              </button>
            </div>
          </div>
          <p class="mt-3 mb-3 line-clamp-2 min-h-9 text-[13px] leading-[18px] text-[var(--pc-text-secondary)]">
            {{ project.description || '暂无项目描述' }}
          </p>
          <footer class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--pc-border-soft)] pt-3 text-xs text-[var(--pc-text-secondary)]">
            <span class="inline-flex items-center gap-1.5"><el-icon><Collection /></el-icon>{{ project.sprints_count }} 个迭代</span>
            <span class="inline-flex items-center gap-1.5"><el-icon><Tickets /></el-icon>{{ project.issues_count }} 个任务</span>
            <span class="ml-auto inline-flex items-center gap-1 text-[var(--pc-action)]">进入项目 <el-icon><ArrowRight /></el-icon></span>
          </footer>
        </article>
      </div>
      <EmptyState v-else-if="!loading" :title="data?.projects.length ? '没有匹配的项目' : '还没有项目'" :description="data?.projects.length ? '换一个团队或搜索关键词试试。' : '创建项目后开始规划迭代。'">
        <el-button v-if="data?.can_manage_projects && !data.projects.length" type="primary" data-testid="create-project-empty-button" @click="createProject">
          创建项目
        </el-button>
      </EmptyState>
    </section>

    <ProjectDialog
      v-if="data"
      v-model="projectDialogOpen"
      :organization-id="organizationId"
      :teams="data.teams"
      :project="editingProject"
      @saved="load"
    />
    <TeamDialog v-model="teamDialogOpen" :organization-id="organizationId" @saved="load" />
  </div>
</template>
