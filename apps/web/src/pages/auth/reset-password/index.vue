<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetPassword, verifyResetToken } from '@/api/auth'
import { apiErrorMessage } from '@/api/client'
import AuthLayout from '@/components/auth-layout.vue'

const route = useRoute()
const router = useRouter()
const token = ref('')
const username = ref('')
const validating = ref(true)
const valid = ref(false)
const password = ref('')
const confirmPassword = ref('')
const submitting = ref(false)

onMounted(async () => {
  token.value = typeof route.query.token === 'string'
    ? route.query.token
    : typeof route.query.reset_token === 'string'
      ? route.query.reset_token
      : ''
  if (!token.value) {
    validating.value = false
    return
  }
  try {
    const result = await verifyResetToken(token.value)
    valid.value = result.valid
    username.value = result.username || ''
  }
  finally {
    validating.value = false
  }
})

async function submit() {
  if (password.value.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }
  if (password.value !== confirmPassword.value) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  submitting.value = true
  try {
    const result = await resetPassword(token.value, password.value)
    ElMessage.success(result.message)
    await router.replace('/login')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '重置失败'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout title="设置新密码" :description="username ? `正在重置 ${username} 的密码` : '创建一个新的登录密码'">
    <div v-if="validating" v-loading="true" class="min-h-40" />
    <el-result v-else-if="!valid" icon="error" title="链接无效或已过期" sub-title="请重新申请密码重置链接">
      <template #extra>
        <RouterLink to="/forgot-password">
          <el-button type="primary">
            重新申请
          </el-button>
        </RouterLink>
      </template>
    </el-result>
    <el-form v-else label-position="top" @submit.prevent="submit">
      <el-form-item label="新密码">
        <el-input v-model="password" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="确认新密码">
        <el-input v-model="confirmPassword" type="password" show-password autocomplete="new-password" @keyup.enter="submit" />
      </el-form-item>
      <el-button type="primary" native-type="submit" :loading="submitting">
        保存新密码
      </el-button>
    </el-form>
  </AuthLayout>
</template>
