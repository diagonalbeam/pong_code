<script setup lang="ts">
import { ArrowRight, Plus, Search, UserFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrganizationTeams } from '@/api/teams'
import { apiErrorMessage } from '@/api/client'
import type { Organization, Team } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import LoadingSkeleton from '@/components/loading-skeleton.vue'
import PageHeader from '@/components/page-header.vue'
import TeamDialog from '@/components/business/team-dialog.vue'

const route = useRoute()
const router = useRouter()
const organizationId = computed(() => Number(route.params.orgId))
const organization = ref<Organization | null>(null)
const teams = ref<Team[]>([])
const search = ref('')
const loading = ref(true)
const createOpen = ref(false)
const filtered = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return keyword
    ? teams.value.filter(team => `${team.name} ${team.description}`.toLowerCase().includes(keyword))
    : teams.value
})

async function load() {
  loading.value = true
  try {
    const result = await getOrganizationTeams(organizationId.value)
    organization.value = result.organization
    teams.value = result.teams
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载团队失败'))
  }
  finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-[1440px] p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader :title="`${organization?.name || ''} · 团队`" description="查看组织中的协作团队。">
      <el-button type="primary" data-testid="create-team-button" @click="createOpen = true">
        <el-icon><Plus /></el-icon>创建团队
      </el-button>
    </PageHeader>
    <section class="min-h-60">
      <div class="pc-filter-bar max-sm:flex-wrap">
        <div class="w-full max-w-[360px] max-sm:max-w-none max-sm:basis-full">
          <el-input v-model="search" clearable placeholder="搜索团队">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <span class="ml-auto shrink-0 text-xs text-[var(--pc-text-muted)]">
          {{ filtered.length }} 个团队
        </span>
      </div>
      <LoadingSkeleton v-if="loading" variant="cards" />
      <div v-else-if="filtered.length" class="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <article
          v-for="team in filtered"
          :key="team.id"
          data-testid="team-card"
          class="flex min-h-[148px] cursor-pointer flex-col rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-4 transition-[border-color,background-color] duration-[160ms] hover:border-[color-mix(in_srgb,var(--pc-action)_38%,var(--pc-border))] hover:bg-[color-mix(in_srgb,var(--pc-action)_2%,var(--pc-surface))]"
          role="button"
          tabindex="0"
          @click="router.push(`/teams/${team.id}`)"
          @keydown.enter.self="router.push(`/teams/${team.id}`)"
          @keydown.space.self.prevent="router.push(`/teams/${team.id}`)"
        >
          <div class="flex items-start gap-3">
            <div class="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--pc-radius-md)] bg-[color-mix(in_srgb,var(--pc-action)_10%,var(--pc-surface))] text-base text-[var(--pc-action)]">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="m-0 truncate text-[17px] leading-5 font-semibold tracking-[-0.01em] text-[var(--pc-text)]">{{ team.name }}</h2>
              <p class="mt-1.5 mb-0 line-clamp-2 text-[13px] leading-[18px] text-[var(--pc-text-secondary)]">
                {{ team.description || '暂无团队描述' }}
              </p>
            </div>
          </div>
          <footer class="mt-auto flex items-center border-t border-[var(--pc-border-soft)] pt-3 text-xs text-[var(--pc-text-secondary)]">
            <span class="inline-flex items-center gap-1.5"><el-icon><UserFilled /></el-icon>{{ team.members_count }} 位成员</span>
            <span class="ml-auto inline-flex items-center gap-1 text-[var(--pc-action)]">查看团队 <el-icon><ArrowRight /></el-icon></span>
          </footer>
        </article>
      </div>
      <EmptyState v-else :title="search ? '没有匹配的团队' : '还没有团队'">
        <el-button v-if="!search" type="primary" data-testid="create-team-empty-button" @click="createOpen = true">
          创建团队
        </el-button>
      </EmptyState>
    </section>
    <TeamDialog v-model="createOpen" :organization-id="organizationId" @saved="load" />
  </div>
</template>
