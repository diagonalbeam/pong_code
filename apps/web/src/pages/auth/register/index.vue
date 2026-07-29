<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '@/api/auth'
import { apiErrorMessage } from '@/api/client'
import AuthLayout from '@/components/auth-layout.vue'

const router = useRouter()
const submitting = ref(false)
const confirmPassword = ref('')
const form = reactive({
  username: '',
  email: '',
  password: '',
})

async function submit() {
  if (!form.username.trim() || !form.email.trim() || !form.password) {
    ElMessage.warning('请填写所有必填项')
    return
  }
  if (form.password.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }
  if (form.password !== confirmPassword.value) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  submitting.value = true
  try {
    const result = await register(form)
    ElMessage.success(result.message || '注册成功')
    await router.replace('/login')
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '注册失败'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout title="创建账号" description="加入团队，开始管理敏捷项目">
    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="用户名">
        <el-input v-model="form.username" data-testid="register-username" autocomplete="username" maxlength="64" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="form.email" data-testid="register-email" type="email" autocomplete="email" maxlength="120" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="form.password" data-testid="register-password" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="确认密码">
        <el-input v-model="confirmPassword" data-testid="register-password-confirm" type="password" show-password autocomplete="new-password" @keyup.enter="submit" />
      </el-form-item>
      <el-button data-testid="register-submit" type="primary" native-type="submit" :loading="submitting">
        注册
      </el-button>
      <p class="mt-5 mb-0 text-center">
        已有账号？
        <RouterLink class="text-[var(--pc-action)] no-underline" to="/login">
          返回登录
        </RouterLink>
      </p>
    </el-form>
  </AuthLayout>
</template>
