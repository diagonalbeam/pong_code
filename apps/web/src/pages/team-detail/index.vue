<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getOrganizationMembers } from '@/api/organizations'
import { addTeamMember, getTeam, joinTeam, leaveTeam } from '@/api/teams'
import { apiErrorMessage } from '@/api/client'
import type { Organization, Team, User } from '@/api/types'
import EmptyState from '@/components/empty-state.vue'
import PageHeader from '@/components/page-header.vue'
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
    <section v-loading="loading" class="rounded-[var(--pc-radius-card)] border border-[var(--pc-border-soft)] bg-[var(--pc-surface)] p-6 max-md:rounded-[var(--pc-radius-lg)] max-md:p-[17px]">
      <div class="mb-6 flex flex-wrap gap-x-[17px] gap-y-2 text-sm text-[var(--pc-text-secondary)]">
        <span>所属组织</span>
        <RouterLink v-if="organization" class="text-[var(--pc-action)] no-underline" :to="`/organizations/${organization.id}`">
          {{ organization.name }}
        </RouterLink>
        <span>{{ members.length }} 位成员</span>
      </div>
      <div v-if="members.length">
        <article v-for="member in members" :key="member.id" class="grid min-h-[72px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--pc-border-soft)] py-3 last:border-b-0">
          <el-avatar :size="44">
            {{ member.username.slice(0, 1).toUpperCase() }}
          </el-avatar>
          <div>
            <h2 class="m-0 text-[15px] font-semibold">{{ member.username }}</h2>
            <p class="mt-0.5 mb-0 text-[13px] text-[var(--pc-text-secondary)]">{{ member.email }}</p>
          </div>
          <el-tag round :type="member.role === 'leader' ? 'warning' : 'info'">
            {{ member.role === 'leader' ? '负责人' : '成员' }}
          </el-tag>
        </article>
      </div>
      <EmptyState v-else-if="!loading" title="团队还没有成员" />
    </section>

    <el-dialog v-model="memberDialogOpen" title="添加团队成员" width="500px">
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
    </el-dialog>
  </div>
</template>
