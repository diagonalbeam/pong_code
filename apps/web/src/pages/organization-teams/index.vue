<script setup lang="ts">
import { Plus, Search, UserFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrganizationTeams } from '@/api/teams'
import { apiErrorMessage } from '@/api/client'
import type { Organization, Team } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
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
    <section class="rounded-[var(--pc-radius-card)] border border-[var(--pc-border-soft)] bg-[var(--pc-surface)] p-6 max-md:rounded-[var(--pc-radius-lg)] max-md:p-[17px]">
      <el-input v-model="search" clearable placeholder="搜索团队" class="mb-6 max-w-[360px]">
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <div v-loading="loading" class="grid min-h-60 grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-5">
        <article
          v-for="team in filtered"
          :key="team.id"
          data-testid="team-card"
          class="min-h-[210px] cursor-pointer rounded-[8px] border border-[var(--pc-border-soft)] bg-[var(--pc-surface)] p-6 hover:border-[color-mix(in_srgb,var(--pc-action)_35%,var(--pc-border))]"
          role="button"
          tabindex="0"
          @click="router.push(`/teams/${team.id}`)"
          @keydown.enter="router.push(`/teams/${team.id}`)"
        >
          <div class="grid h-12 w-12 place-items-center rounded-[8px] bg-[color-mix(in_srgb,var(--pc-action)_12%,var(--pc-surface))] text-[21px] text-[var(--pc-action)]">
            <el-icon><UserFilled /></el-icon>
          </div>
          <h2 class="mt-5 mb-1.5 text-[21px] font-semibold">{{ team.name }}</h2>
          <p class="mb-5 min-h-10 line-clamp-2 text-sm text-[var(--pc-text-secondary)]">
            {{ team.description || '暂无团队描述' }}
          </p>
          <span class="text-[13px] text-[var(--pc-text-muted)]">{{ team.members_count }} 位成员</span>
        </article>
        <EmptyState v-if="!loading && !filtered.length" :title="search ? '没有匹配的团队' : '还没有团队'">
          <el-button v-if="!search" type="primary" data-testid="create-team-empty-button" @click="createOpen = true">
            创建团队
          </el-button>
        </EmptyState>
      </div>
    </section>
    <TeamDialog v-model="createOpen" :organization-id="organizationId" @saved="load" />
  </div>
</template>
