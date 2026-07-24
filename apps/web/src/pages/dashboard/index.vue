<script setup lang="ts">
import { CircleCheckFilled, FolderOpened, OfficeBuilding } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { deleteOrganization, getOrganizations } from '@/api/organizations'
import { apiErrorMessage } from '@/api/client'
import type { Organization } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import PageHeader from '@/components/page-header.vue'
import StatCard from '@/components/stat-card.vue'
import OrganizationActions from '@/components/business/organization-actions.vue'
import OrganizationCard from '@/components/business/organization-card.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const organizations = ref<Organization[]>([])
const loading = ref(true)
const actions = ref<InstanceType<typeof OrganizationActions>>()

const projectCount = computed(() => organizations.value.reduce((sum, item) => sum + item.projects_count, 0))
const doneCount = computed(() => organizations.value.reduce((sum, item) => sum + item.done_issues_count, 0))
const organizationPreview = computed(() => organizations.value.slice(0, 3))

async function load() {
  loading.value = true
  try {
    organizations.value = await getOrganizations()
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载组织失败'))
  }
  finally {
    loading.value = false
  }
}

async function removeOrganization(organization: Organization) {
  try {
    await ElMessageBox.confirm(
      `删除组织“${organization.name}”将同时删除其中的项目、迭代、任务、需求、缺陷、工时和附件。此操作不可恢复。`,
      '确认删除组织',
      { type: 'warning', confirmButtonText: '删除组织', cancelButtonText: '取消' },
    )
    await deleteOrganization(organization.id)
    ElMessage.success('组织已删除')
    await load()
  }
  catch (error) {
    if (error === 'cancel' || error === 'close')
      return
    ElMessage.error(apiErrorMessage(error, '删除组织失败'))
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-[1440px] p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader title="控制台" :description="`你好，${auth.user?.username || ''}。这是你当前的项目概览。`">
      <OrganizationActions ref="actions" @changed="load" />
    </PageHeader>

    <section aria-label="项目概览" class="mb-8 grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:[&>*:last-child]:col-span-2">
      <StatCard label="组织" :value="organizations.length" hint="你拥有或加入的组织">
        <template #icon><el-icon><OfficeBuilding /></el-icon></template>
      </StatCard>
      <StatCard label="项目" :value="projectCount" hint="所有组织中的项目">
        <template #icon><el-icon><FolderOpened /></el-icon></template>
      </StatCard>
      <StatCard label="已完成任务" :value="doneCount" hint="仅统计已完成任务">
        <template #icon><el-icon><CircleCheckFilled /></el-icon></template>
      </StatCard>
    </section>

    <section>
      <div class="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 class="m-0 font-['SF_Pro_Display',system-ui,-apple-system,sans-serif] text-xl leading-tight font-semibold tracking-[-0.015em]">我的组织</h2>
          <p class="mt-1 mb-0 text-sm leading-5 text-[var(--pc-text-secondary)]">进入组织后查看团队、项目和成员。</p>
        </div>
        <RouterLink class="inline-flex min-h-10 items-center gap-1 text-sm text-[var(--pc-action)] no-underline" to="/organizations">
          查看全部 <span aria-hidden="true">›</span>
        </RouterLink>
      </div>

      <div v-loading="loading" class="min-h-60">
        <div v-if="organizationPreview.length" class="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <OrganizationCard
            v-for="organization in organizationPreview"
            :key="organization.id"
            :organization="organization"
            :can-delete="organization.owner_id === auth.user?.id"
            @open="router.push(`/organizations/${organization.id}`)"
            @remove="removeOrganization(organization)"
          />
        </div>
        <EmptyState v-else-if="!loading" title="还没有组织" description="创建一个组织，或按准确名称加入已有组织。">
          <div class="flex gap-2">
            <el-button data-testid="join-org-empty-button" @click="actions?.openJoin()">
              加入组织
            </el-button>
            <el-button type="primary" data-testid="create-org-empty-button" @click="actions?.openCreate()">
              创建组织
            </el-button>
          </div>
        </EmptyState>
      </div>
    </section>
  </div>
</template>
