<script setup lang="ts">
import { Clock } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { formatHours } from '@/shared/board'
import { calculateSprintDeadline, calculateWorkloadRisk, type DeadlineTone } from '@/shared/deadline'

const props = defineProps<{
  startDate: string | null
  endDate: string | null
  status: 'open' | 'active' | 'closed'
  remainingEstimates?: Array<{ name: string, hours: number }>
  bugCount?: number
  /** 仅供测试注入固定日期；业务代码使用北京时间的当天。 */
  today?: string
}>()

const deadline = computed(() => calculateSprintDeadline(
  {
    startDate: props.startDate,
    endDate: props.endDate,
    status: props.status,
  },
  props.today,
))

const toneColors: Record<DeadlineTone, string> = {
  action: 'var(--pc-action)',
  warning: 'var(--pc-warning)',
  danger: 'var(--pc-danger)',
  success: 'var(--pc-success)',
  muted: 'var(--pc-text-muted)',
}

const workloadRisk = computed(() => calculateWorkloadRisk(
  props.remainingEstimates || [],
  deadline.value.remainingDays,
  props.status,
))
const tone = computed(() => {
  if (workloadRisk.value.overdue.length)
    return 'danger' as const
  if (workloadRisk.value.risk.length)
    return 'warning' as const
  if (deadline.value.tone === 'muted')
    return 'muted' as const
  return props.status === 'closed' ? 'success' as const : 'action' as const
})
const toneColor = computed(() => toneColors[tone.value])
function estimatesLabel(estimates: Array<{ name: string, hours: number }>) {
  return estimates.map(({ name, hours }) => `${name}：${formatHours(hours)}h`).join('，')
}
const riskLabel = computed(() => {
  const labels: string[] = []
  if (workloadRisk.value.risk.length)
    labels.push(`有风险：${estimatesLabel(workloadRisk.value.risk)}`)
  if (workloadRisk.value.overdue.length)
    labels.push(`逾期：${estimatesLabel(workloadRisk.value.overdue)}`)
  return labels.join('，')
})
const remainingHoursLabel = computed(() => {
  const estimates = props.remainingEstimates || []
  if (riskLabel.value)
    return `（${riskLabel.value}，缺陷数量：${props.bugCount || 0}）`
  const estimateLabel = estimates.length
    ? estimatesLabel(estimates)
    : '0h'
  return `（预估剩余人员工时 ${estimateLabel}，缺陷数量：${props.bugCount || 0}）`
})
const displayLabel = computed(() => `${deadline.value.label}${remainingHoursLabel.value}`)
const progressLabel = computed(() => deadline.value.percent === null
  ? `迭代截止状态：${displayLabel.value}`
  : `迭代时间进度 ${deadline.value.percent}%，${displayLabel.value}`)
</script>

<template>
  <div
    data-testid="board-deadline"
    class="flex flex-wrap items-center gap-x-3 gap-y-2"
  >
    <span
      class="inline-flex items-center gap-1.5 text-[13px] leading-none font-medium"
      :style="{ color: toneColor }"
    >
      <el-icon :size="15"><Clock /></el-icon>
      {{ displayLabel }}
    </span>

    <div
      v-if="deadline.showProgress"
      class="h-1.5 min-w-[180px] max-w-[520px] flex-1 overflow-hidden rounded-full bg-[var(--pc-border-soft)]"
      role="progressbar"
      aria-label="迭代截止倒计时"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="deadline.percent ?? 0"
      :aria-valuetext="progressLabel"
    >
      <div
        class="h-full rounded-full transition-[width] duration-[160ms] ease-out"
        :style="{ width: `${deadline.percent ?? 0}%`, backgroundColor: toneColor }"
      />
    </div>
  </div>
</template>
