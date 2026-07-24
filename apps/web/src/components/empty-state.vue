<script setup lang="ts">
import { Box } from '@element-plus/icons-vue'

defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <el-empty :image-size="72">
    <template #image>
      <div
        class="m-auto grid h-16 w-16 place-items-center rounded-[8px] bg-[var(--pc-surface-soft)] text-[var(--pc-text-muted)]"
        aria-hidden="true"
      >
        <el-icon :size="30">
          <Box />
        </el-icon>
      </div>
    </template>
    <template #description>
      <div>
        <strong class="text-[15px] font-semibold text-[var(--pc-text)]">{{ title }}</strong>
        <p v-if="description" class="mt-1 mb-0 text-[13px] text-[var(--pc-text-secondary)]">
          {{ description }}
        </p>
      </div>
    </template>
    <slot />
  </el-empty>
</template>
