<script setup lang="ts">
import { ArrowRight, Delete, FolderOpened, UserFilled } from '@element-plus/icons-vue'
import type { Organization } from '@/api/types'

defineProps<{
  organization: Organization
  canDelete: boolean
}>()

const emit = defineEmits<{
  open: []
  remove: []
}>()
</script>

<template>
  <article
    class="flex min-h-[148px] cursor-pointer flex-col rounded-[var(--pc-radius-card)] border border-[var(--pc-border)] bg-[var(--pc-surface)] p-4 transition-[border-color,background-color] duration-[160ms] hover:border-[color-mix(in_srgb,var(--pc-action)_38%,var(--pc-border))] hover:bg-[color-mix(in_srgb,var(--pc-action)_2%,var(--pc-surface))]"
    data-testid="organization-card"
    role="button"
    tabindex="0"
    @click="emit('open')"
    @keydown.enter="emit('open')"
    @keydown.space.prevent="emit('open')"
  >
    <div class="flex items-start gap-3">
      <div class="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--pc-radius-md)] bg-[color-mix(in_srgb,var(--pc-action)_10%,var(--pc-surface))] text-base font-semibold text-[var(--pc-action)]">
        {{ organization.name.slice(0, 1) }}
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="m-0 truncate text-[17px] leading-5 font-semibold tracking-[-0.01em] text-[var(--pc-text)]">{{ organization.name }}</h3>
        <p class="mt-1 mb-0 truncate text-xs leading-4 text-[var(--pc-text-secondary)]">所有者：{{ organization.owner_name || '未知' }}</p>
      </div>
      <button
        v-if="canDelete"
        type="button"
        class="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--pc-radius-sm)] border-0 bg-transparent p-0 text-[var(--pc-text-muted)] transition-colors duration-[160ms] hover:bg-[color-mix(in_srgb,var(--pc-danger)_8%,var(--pc-surface))] hover:text-[var(--pc-danger)]"
        data-testid="delete-organization-button"
        :aria-label="`删除组织 ${organization.name}`"
        @click.stop="emit('remove')"
      >
        <el-icon><Delete /></el-icon>
      </button>
    </div>
    <div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--pc-border-soft)] pt-3 text-xs text-[var(--pc-text-secondary)]">
      <span class="inline-flex items-center gap-1.5"><el-icon><FolderOpened /></el-icon>{{ organization.projects_count }} 个项目</span>
      <span class="inline-flex items-center gap-1.5"><el-icon><UserFilled /></el-icon>{{ organization.done_issues_count }} 个已完成任务</span>
      <span class="ml-auto inline-flex items-center gap-1 text-[var(--pc-action)]">进入 <el-icon><ArrowRight /></el-icon></span>
    </div>
  </article>
</template>
