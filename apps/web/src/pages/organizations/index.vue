<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { deleteOrganization, getOrganizations } from '@/api/organizations'
import { apiErrorMessage } from '@/api/client'
import type { Organization } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import PageHeader from '@/components/page-header.vue'
import OrganizationActions from '@/components/business/organization-actions.vue'
import OrganizationCard from '@/components/business/organization-card.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const organizations = ref<Organization[]>([])
const search = ref('')
const loading = ref(true)
const actions = ref<InstanceType<typeof OrganizationActions>>()
const filtered = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return keyword
    ? organizations.value.filter(item => item.name.toLowerCase().includes(keyword))
    : organizations.value
})

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
      `删除组织“${organization.name}”将级联删除所有项目数据和附件，此操作不可恢复。`,
      '确认删除组织',
      { type: 'warning', confirmButtonText: '删除组织' },
    )
    await deleteOrganization(organization.id)
    await load()
    ElMessage.success('组织已删除')
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
    <PageHeader title="组织" description="查看、创建或加入协作组织。">
      <OrganizationActions ref="actions" @changed="load" />
    </PageHeader>
    <section v-loading="loading" class="min-h-60">
      <div class="mb-4 flex items-center gap-3 rounded-[var(--pc-radius-card)] border border-[var(--pc-border-soft)] bg-[var(--pc-surface-soft)] p-3 max-sm:flex-wrap">
        <div class="w-full max-w-[360px] max-sm:max-w-none max-sm:basis-full">
          <el-input v-model="search" clearable placeholder="搜索组织" />
        </div>
        <span class="ml-auto shrink-0 text-xs text-[var(--pc-text-muted)]">
          {{ filtered.length }} 个组织
        </span>
      </div>
      <div v-if="filtered.length" class="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <OrganizationCard
          v-for="organization in filtered"
          :key="organization.id"
          :organization="organization"
          :can-delete="organization.owner_id === auth.user?.id"
          @open="router.push(`/organizations/${organization.id}`)"
          @remove="removeOrganization(organization)"
        />
      </div>
      <EmptyState v-else-if="!loading" :title="search ? '没有匹配的组织' : '还没有组织'" :description="search ? '尝试使用其他关键词。' : '创建一个组织，或按准确名称加入已有组织。'">
        <div v-if="!search" class="flex gap-2">
          <el-button data-testid="join-org-empty-button" @click="actions?.openJoin()">
            加入组织
          </el-button>
          <el-button type="primary" data-testid="create-org-empty-button" @click="actions?.openCreate()">
            创建组织
          </el-button>
        </div>
      </EmptyState>
    </section>
  </div>
</template>
