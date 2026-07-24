import type { Bug } from '@/api/types'

export const bugStatusLabels: Record<Bug['status'], string> = {
  open: '待处理',
  in_progress: '处理中',
  fixed: '已修复',
  resolved: '已修复',
  closed: '已关闭',
  rejected: '已拒绝',
}
