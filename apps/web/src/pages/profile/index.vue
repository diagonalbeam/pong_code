<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { updateProfile } from '@/api/auth'
import { apiErrorMessage } from '@/api/client'
import PageHeader from '@/components/page-header.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const submitting = ref(false)
const form = reactive({
  username: auth.user?.username || '',
  email: auth.user?.email || '',
})

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
    <section class="grid grid-cols-[96px_minmax(0,1fr)] gap-6 rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-4 max-sm:grid-cols-1">
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
  </div>
</template>
