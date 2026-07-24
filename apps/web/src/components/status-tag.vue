<script setup lang="ts">
import { computed } from 'vue'

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

const type = computed(() => {
  if (['done', 'completed', 'closed'].includes(props.status))
    return 'success'
  if (['doing', 'active', 'in_progress', 'fixed', 'resolved', 'testing'].includes(props.status))
    return 'warning'
  if (props.status === 'rejected')
    return 'danger'
  return 'info'
})
</script>

<template>
  <el-tag :type="type" effect="light" round>
    {{ label || labels[status] || status }}
  </el-tag>
</template>
