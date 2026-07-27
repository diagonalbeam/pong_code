<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getOrganizationMembers } from '@/api/organizations'
import { addTeamMember, getTeam, joinTeam, leaveTeam } from '@/api/teams'
import { apiErrorMessage } from '@/api/client'
import type { Organization, Team, User } from '@/api/types'
import AppDialog from '@/components/app-dialog.vue'
import EmptyState from '@/components/empty-state.vue'
import PageHeader from '@/components/page-header.vue'
import { getUserAvatarStyle } from '@/shared/avatar-color'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()
const teamId = computed(() => Number(route.params.teamId))
const team = ref<Team | null>(null)
const organization = ref<Organization | null>(null)
const members = ref<User[]>([])
const orgMembers = ref<User[]>([])
const loading = ref(true)
const memberDialogOpen = ref(false)
const submitting = ref(false)
const memberForm = reactive({ user_id: undefined as number | undefined, role: 'member' })

const isMember = computed(() => members.value.some(member => member.id === auth.user?.id))
const canManage = computed(() => (
  organization.value?.owner_id === auth.user?.id
  || members.value.some(member => member.id === auth.user?.id && member.role === 'leader')
))
const availableMembers = computed(() => orgMembers.value.filter(member => !members.value.some(current => current.id === member.id)))

async function load() {
  loading.value = true
  try {
    const result = await getTeam(teamId.value)
    team.value = result.team
    organization.value = result.organization
    members.value = result.members
    if (canManage.value) {
      const orgResult = await getOrganizationMembers(result.organization.id)
      orgMembers.value = orgResult.members
    }
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载团队失败'))
  }
  finally {
    loading.value = false
  }
}

async function join() {
  try {
    const result = await joinTeam(teamId.value)
    ElMessage.success(result.message)
    await load()
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加入团队失败'))
  }
}

async function leave() {
  try {
    const result = await leaveTeam(teamId.value)
    ElMessage.success(result.message)
    await load()
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '离开团队失败'))
  }
}

async function addMember() {
  if (!memberForm.user_id) {
    ElMessage.warning('请选择组织成员')
    return
  }
  submitting.value = true
  try {
    const result = await addTeamMember(teamId.value, memberForm as { user_id: number; role: string })
    ElMessage.success(result.message)
    memberDialogOpen.value = false
    memberForm.user_id = undefined
    await load()
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '添加成员失败'))
  }
  finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-[1440px] p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader :title="team?.name || '团队详情'" :description="team?.description || '查看团队成员和角色。'">
      <el-button v-if="!isMember" type="primary" data-testid="join-team-button" :data-team-id="teamId" @click="join">
        加入团队
      </el-button>
      <el-button v-else @click="leave">
        离开团队
      </el-button>
      <el-button v-if="canManage" type="primary" @click="memberDialogOpen = true">
        添加成员
      </el-button>
    </PageHeader>
    <section v-loading="loading" class="min-h-60">
      <div class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--pc-radius-card)] border border-[var(--pc-border-soft)] bg-[var(--pc-surface-soft)] p-3 text-sm text-[var(--pc-text-secondary)]">
        <span class="text-xs text-[var(--pc-text-muted)]">所属组织</span>
        <RouterLink v-if="organization" class="text-[var(--pc-action)] no-underline" :to="`/organizations/${organization.id}`">
          {{ organization.name }}
        </RouterLink>
        <span class="ml-auto text-xs text-[var(--pc-text-muted)]">{{ members.length }} 位成员</span>
      </div>
      <div v-if="members.length" class="pc-list-panel px-4">
        <article v-for="member in members" :key="member.id" class="grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--pc-border-soft)] py-2.5 last:border-b-0">
          <el-avatar :size="36" :style="getUserAvatarStyle(member.username)">
            {{ member.username.slice(0, 1).toUpperCase() }}
          </el-avatar>
          <div class="min-w-0">
            <h2 class="m-0 truncate text-sm font-semibold">{{ member.username }}</h2>
            <p class="mt-0.5 mb-0 truncate text-xs text-[var(--pc-text-secondary)]">{{ member.email }}</p>
          </div>
          <el-tag class="!rounded-[var(--pc-radius-sm)]" :type="member.role === 'leader' ? 'warning' : 'info'">
            {{ member.role === 'leader' ? '负责人' : '成员' }}
          </el-tag>
        </article>
      </div>
      <EmptyState v-else-if="!loading" title="团队还没有成员" />
    </section>

    <AppDialog v-model="memberDialogOpen" title="添加团队成员" width="500px" :loading="submitting">
      <el-form label-position="top">
        <el-form-item label="组织成员" required>
          <el-select v-model="memberForm.user_id" filterable class="w-full" placeholder="选择成员">
            <el-option v-for="member in availableMembers" :key="member.id" :label="`${member.username} (${member.email})`" :value="member.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="团队角色">
          <el-radio-group v-model="memberForm.role">
            <el-radio value="member">
              成员
            </el-radio>
            <el-radio value="leader">
              负责人
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="memberDialogOpen = false">
          取消
        </el-button>
        <el-button type="primary" :loading="submitting" @click="addMember">
          添加
        </el-button>
      </template>
    </AppDialog>
  </div>
</template>
