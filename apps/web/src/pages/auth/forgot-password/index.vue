<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import { forgotPassword } from '@/api/auth'
import { apiErrorMessage } from '@/api/client'
import AuthLayout from '@/components/auth-layout.vue'

const email = ref('')
const submitting = ref(false)
const sent = ref(false)
const message = ref('')

async function submit() {
  if (!email.value.trim()) {
    ElMessage.warning('请输入邮箱')
    return
  }
  submitting.value = true
  try {
    const result = await forgotPassword(email.value.trim())
    message.value = result.message
    sent.value = true
  }
  catch (error) {
    ElMessage.error(apiErrorMessage(error, '发送失败'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout title="找回密码" description="我们会向已注册邮箱发送重置链接">
    <el-result v-if="sent" icon="success" title="请检查邮箱" :sub-title="message">
      <template #extra>
        <RouterLink class="text-[var(--pc-action)] no-underline" to="/login">
          <el-button type="primary">
            返回登录
          </el-button>
        </RouterLink>
      </template>
    </el-result>
    <el-form v-else label-position="top" @submit.prevent="submit">
      <el-form-item label="注册邮箱">
        <el-input v-model="email" type="email" autocomplete="email" placeholder="name@example.com" @keyup.enter="submit" />
      </el-form-item>
      <el-button type="primary" native-type="submit" :loading="submitting">
        发送重置链接
      </el-button>
      <p class="mt-5 mb-0 text-center">
        <RouterLink class="text-[var(--pc-action)] no-underline" to="/login">
          返回登录
        </RouterLink>
      </p>
    </el-form>
  </AuthLayout>
</template>
