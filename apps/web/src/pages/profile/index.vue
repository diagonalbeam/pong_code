<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { getCliToken, rotateCliToken, updateProfile } from '@/api/auth'
import { apiErrorMessage } from '@/api/client'
import PageHeader from '@/components/page-header.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const submitting = ref(false)
const form = reactive({
  username: auth.user?.username || '',
  email: auth.user?.email || '',
})
const cliToken = ref('')
const tokenLoading = ref(false)
const rotating = ref(false)

async function loadToken() {
  tokenLoading.value = true
  try {
    const result = await getCliToken()
    cliToken.value = result.cli_token
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载 CLI Token 失败'))
  }
  finally {
    tokenLoading.value = false
  }
}

async function copyToken() {
  if (!cliToken.value) return
  try {
    await navigator.clipboard.writeText(cliToken.value)
    ElMessage.success('CLI Token 已复制')
  }
  catch {
    ElMessage.error('复制 CLI Token 失败')
  }
}

async function rotateToken() {
  try {
    await ElMessageBox.confirm('重新生成后，当前 CLI Token 将立即失效。', '轮换 CLI Token', {
      type: 'warning',
      confirmButtonText: '重新生成',
    })
  }
  catch {
    return
  }

  rotating.value = true
  try {
    const result = await rotateCliToken()
    cliToken.value = result.cli_token
    ElMessage.success('CLI Token 已重新生成')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '轮换 CLI Token 失败'))
  }
  finally {
    rotating.value = false
  }
}

onMounted(loadToken)

async function submit() {
  if (!form.username.trim() || !form.email.trim()) {
    ElMessage.warning('用户名和邮箱不能为空')
    return
  }
  submitting.value = true
  try {
    const result = await updateProfile({
      username: form.username.trim(),
      email: form.email.trim(),
    })
    auth.setUser(result.user)
    ElMessage.success('个人资料已更新')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '更新个人资料失败'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-[860px] p-6 max-md:px-3 max-md:pt-[17px] max-md:pb-8">
    <PageHeader title="个人资料" description="管理用于登录和协作展示的账号信息。" />
    <section class="pc-section-panel grid grid-cols-[96px_minmax(0,1fr)] gap-6 p-4 max-sm:grid-cols-1">
      <div class="grid h-[72px] w-[72px] place-items-center rounded-[var(--pc-radius-md)] bg-[color-mix(in_srgb,var(--pc-action)_12%,var(--pc-surface))] text-[30px] font-semibold text-[var(--pc-action)]">
        {{ auth.user?.username?.slice(0, 1).toUpperCase() }}
      </div>
      <el-form data-testid="profile-form" label-position="top" @submit.prevent="submit">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" data-testid="profile-username-input" maxlength="64" autocomplete="username" />
        </el-form-item>
        <el-form-item label="邮箱" required>
          <el-input v-model="form.email" data-testid="profile-email-input" type="email" maxlength="120" autocomplete="email" />
        </el-form-item>
        <el-button type="primary" native-type="submit" data-testid="profile-submit-button" :loading="submitting">
          保存修改
        </el-button>
      </el-form>
    </section>
    <section class="pc-section-panel mt-4 p-4">
      <div class="mb-3 flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-start">
        <div>
          <h2 class="text-base font-semibold text-[var(--pc-text)]">CLI Token</h2>
          <p class="mt-1 text-sm text-[var(--pc-text-muted)]">用于命令行登录，请像密码一样保管。</p>
        </div>
        <div class="flex gap-2">
          <el-button
            data-testid="profile-token-copy-button"
            :disabled="tokenLoading || !cliToken"
            @click="copyToken"
          >
            复制
          </el-button>
          <el-button
            type="danger"
            plain
            data-testid="profile-token-rotate-button"
            :loading="rotating"
            :disabled="tokenLoading"
            @click="rotateToken"
          >
            重新生成
          </el-button>
        </div>
      </div>
      <el-input
        :model-value="cliToken"
        readonly
        data-testid="profile-token-input"
        autocomplete="off"
      />
      <p class="mt-2 text-xs text-[var(--pc-text-muted)]">泄露后请立即重新生成。</p>
    </section>
  </div>
</template>
