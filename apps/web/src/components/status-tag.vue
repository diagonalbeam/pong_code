<script setup lang="ts">
import { computed } from 'vue'
import { getStatusType } from '@/shared/status'

const props = defineProps<{
  status: string
  label?: string
}>()

const labels: Record<string, string> = {
  open: '未开始',
  active: '进行中',
  closed: '已完成',
  todo: '待处理',
  doing: '进行中',
  done: '已完成',
  pending: '等待排期',
  in_progress: '进行中',
  testing: '等待测试',
  completed: '已完成',
  fixed: '已修复',
  resolved: '已修复',
  rejected: '已拒绝',
}

const type = computed(() => getStatusType(props.status))
</script>

<template>
  <el-tag :type="type" effect="light" round>
    <span class="inline-flex items-center gap-1.5">
      <span>{{ label || labels[status] || status }}</span>
      <slot name="suffix" />
    </span>
  </el-tag>
</template>
