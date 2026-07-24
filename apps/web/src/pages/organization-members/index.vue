<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getOrganizationMembers } from '@/api/organizations'
import { apiErrorMessage } from '@/api/client'
import type { Organization, User } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import PageHeader from '@/components/page-header.vue'

const route = useRoute()
const organizationId = computed(() => Number(route.params.orgId))
const organization = ref<Organization | null>(null)
const members = ref<User[]>([])
const search = ref('')
const loading = ref(true)
const filtered = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return keyword
    ? members.value.filter(member => `${member.username} ${member.email}`.toLowerCase().includes(keyword))
    : members.value
})

async function load() {
  loading.value = true
  try {
    const result = await getOrganizationMembers(organizationId.value)
    organization.value = result.organization
    members.value = result.members
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载组织成员失败'))
  }
  finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-[1440px] p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader :title="`${organization?.name || ''} · 组织成员`" :description="`共 ${members.length} 位成员`" />
    <section class="rounded-[var(--pc-radius-card)] border border-[var(--pc-border-soft)] bg-[var(--pc-surface)] p-6 max-md:rounded-[var(--pc-radius-lg)] max-md:p-[17px]">
      <el-input v-model="search" clearable placeholder="搜索成员" class="mb-[17px] max-w-[360px]">
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <div v-loading="loading" class="min-h-[220px]">
        <article v-for="member in filtered" :key="member.id" class="grid min-h-[72px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--pc-border-soft)] px-1 py-3 last:border-b-0">
          <el-avatar :size="44">
            {{ member.username.slice(0, 1).toUpperCase() }}
          </el-avatar>
          <div>
            <h2 class="m-0 text-[15px] font-semibold">{{ member.username }}</h2>
            <p class="mt-0.5 mb-0 text-[13px] text-[var(--pc-text-secondary)]">{{ member.email }}</p>
          </div>
          <div>
            <el-tag v-if="member.is_owner" type="warning" round>
              所有者
            </el-tag>
            <el-tag v-else round effect="plain">
              {{ member.role === 'admin' ? '管理员' : '成员' }}
            </el-tag>
          </div>
        </article>
        <EmptyState v-if="!loading && !filtered.length" title="没有匹配的成员" />
      </div>
    </section>
  </div>
</template>
