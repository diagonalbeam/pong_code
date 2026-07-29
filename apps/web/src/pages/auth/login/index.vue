<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiErrorMessage } from '@/api/client'
import AuthLayout from '@/components/auth-layout.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const submitting = ref(false)
const form = reactive({
  username: '',
  password: '',
  remember_me: false,
})

async function submit() {
  if (!form.username.trim() || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  submitting.value = true
  try {
    await auth.login(form)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.replace(redirect)
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '登录失败'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout title="欢迎回来" description="登录后继续管理你的项目与迭代">
    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="账号">
        <el-input v-model="form.username" data-testid="login-username" autocomplete="username" placeholder="用户名或邮箱" @keyup.enter="submit" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="form.password" data-testid="login-password" type="password" show-password autocomplete="current-password" placeholder="请输入密码" @keyup.enter="submit" />
      </el-form-item>
      <div class="-mt-1 mb-5 flex items-center justify-between text-sm">
        <el-checkbox v-model="form.remember_me">
          记住登录
        </el-checkbox>
        <RouterLink class="text-[var(--pc-action)] no-underline" to="/forgot-password">
          忘记密码？
        </RouterLink>
      </div>
      <el-button type="primary" native-type="submit" :loading="submitting" data-testid="login-submit">
        登录
      </el-button>
      <p class="mt-5 mb-0 text-center">
        还没有账号？
        <RouterLink class="text-[var(--pc-action)] no-underline" to="/register">
          创建账号
        </RouterLink>
      </p>
    </el-form>
  </AuthLayout>
</template>
