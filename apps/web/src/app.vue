<script setup lang="ts">
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()

onMounted(() => {
  theme.initialize()
  window.addEventListener('pongcode:unauthorized', () => {
    auth.setUser(null)
    if (router.currentRoute.value.meta.requiresAuth)
      void router.replace({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
  })
})
</script>

<template>
  <el-config-provider :locale="zhCn">
    <RouterView />
  </el-config-provider>
</template>
