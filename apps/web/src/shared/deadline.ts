export type DeadlineTone = 'action' | 'warning' | 'danger' | 'success' | 'muted'

export interface SprintDeadlineInput {
  startDate?: string | null
  endDate?: string | null
  status: 'open' | 'active' | 'closed'
}

export interface SprintDeadline {
  label: string
  tone: DeadlineTone
  remainingDays: number | null
  percent: number | null
  showProgress: boolean
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

/** 产品日期统一使用自然日；这里只接受 YYYY-MM-DD，避免浏览器时区改变日期。 */
function parseIsoDate(value: string | null | undefined) {
  if (!value || !ISO_DATE_PATTERN.test(value))
    return null

  const [yearText, monthText, dayText] = value.split('-')
  if (!yearText || !monthText || !dayText)
    return null

  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  )
    return null

  return date.getTime()
}

export function getBeijingToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function calculateElapsedPercent(today: number, startDate: number, endDate: number) {
  if (today <= startDate)
    return 0
  if (today >= endDate)
    return 100

  const totalDays = endDate - startDate
  if (totalDays <= 0)
    return 100

  return Math.round((today - startDate) / totalDays * 100)
}

export function calculateSprintDeadline(
  { startDate, endDate, status }: SprintDeadlineInput,
  today: string = getBeijingToday(),
): SprintDeadline {
  if (!endDate) {
    return {
      label: '未设置截止',
      tone: 'muted',
      remainingDays: null,
      percent: null,
      showProgress: false,
    }
  }

  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  const current = parseIsoDate(today)

  if (!end || !current || (startDate && !start) || (start !== null && start > end)) {
    return {
      label: '日期无效',
      tone: 'muted',
      remainingDays: null,
      percent: null,
      showProgress: false,
    }
  }

  const remainingDays = Math.round((end - current) / DAY_MS)
  const percent = start === null ? null : calculateElapsedPercent(current, start, end)

  if (status === 'closed') {
    return {
      label: '已截止',
      tone: 'success',
      remainingDays,
      percent,
      showProgress: start !== null,
    }
  }

  if (remainingDays < 0) {
    return {
      label: `已逾期 ${Math.abs(remainingDays)} 天`,
      tone: 'danger',
      remainingDays,
      percent,
      showProgress: start !== null,
    }
  }

  if (remainingDays === 0) {
    return {
      label: '今天截止',
      tone: 'danger',
      remainingDays,
      percent,
      showProgress: start !== null,
    }
  }

  if (remainingDays <= 2) {
    return {
      label: `距离结束剩余 ${remainingDays} 天`,
      tone: 'danger',
      remainingDays,
      percent,
      showProgress: start !== null,
    }
  }

  if (remainingDays <= 7) {
    return {
      label: `距离结束剩余 ${remainingDays} 天`,
      tone: 'warning',
      remainingDays,
      percent,
      showProgress: start !== null,
    }
  }

  return {
    label: `距离结束剩余 ${remainingDays} 天`,
    tone: 'action',
    remainingDays,
    percent,
    showProgress: start !== null,
  }
}
