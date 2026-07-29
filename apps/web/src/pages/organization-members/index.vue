<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getOrganizationMembers } from '@/api/organizations'
import { apiErrorMessage } from '@/api/client'
import type { Organization, User } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import LoadingSkeleton from '@/components/loading-skeleton.vue'
import PageHeader from '@/components/page-header.vue'
import { getUserAvatarStyle } from '@/shared/avatar-color'

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
  <div class="mx-auto w-full max-w-[1920px] p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader :title="`${organization?.name || ''} · 组织成员`" :description="`共 ${members.length} 位成员`" />
    <section class="min-h-60">
      <div class="pc-filter-bar max-sm:flex-wrap">
        <div class="w-full max-w-[360px] max-sm:max-w-none max-sm:basis-full">
          <el-input v-model="search" clearable placeholder="搜索成员">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <span class="ml-auto shrink-0 text-xs text-[var(--pc-text-muted)]">
          {{ filtered.length }} 位成员
        </span>
      </div>
      <LoadingSkeleton v-if="loading" variant="list" />
      <div v-else-if="filtered.length" class="pc-list-panel px-4">
        <article v-for="member in filtered" :key="member.id" class="grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--pc-border-soft)] py-2.5 last:border-b-0">
          <el-avatar :size="36" :style="getUserAvatarStyle(member.username)">
            {{ member.username.slice(0, 1).toUpperCase() }}
          </el-avatar>
          <div class="min-w-0">
            <h2 class="m-0 truncate text-sm font-semibold">{{ member.username }}</h2>
            <p class="mt-0.5 mb-0 truncate text-xs text-[var(--pc-text-secondary)]">{{ member.email }}</p>
          </div>
          <div>
            <el-tag v-if="member.is_owner" class="!rounded-[var(--pc-radius-sm)]" type="warning">
              所有者
            </el-tag>
            <el-tag v-else class="!rounded-[var(--pc-radius-sm)]" effect="plain">
              {{ member.role === 'admin' ? '管理员' : '成员' }}
            </el-tag>
          </div>
        </article>
      </div>
      <EmptyState v-else title="没有匹配的成员" />
    </section>
  </div>
</template>
