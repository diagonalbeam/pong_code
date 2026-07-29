<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-[var(--pc-page)]">
    <el-result icon="warning" title="页面不存在" sub-title="你访问的地址不存在，可能已经被移动。">
      <template #extra>
        <el-button type="primary" @click="router.replace('/dashboard')">
          返回控制台
        </el-button>
      </template>
    </el-result>
  </main>
</template>
