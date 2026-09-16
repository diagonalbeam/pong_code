import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateSprintDeadline, getBeijingToday } from './deadline'

const baseInput = {
  startDate: '2026-08-01',
  endDate: '2026-08-14',
  status: 'active',
} as const

describe('迭代截止倒计时', () => {
  it('剩余 8 天及以上使用常规提示', () => {
    expect(calculateSprintDeadline(baseInput, '2026-08-06')).toEqual({
      label: '距离结束剩余 8 天',
      tone: 'action',
      remainingDays: 8,
      percent: Math.round(5 / 13 * 100),
      showProgress: true,
    })
  })

  it('剩余 7 天保持常规状态', () => {
    const deadline = calculateSprintDeadline(baseInput, '2026-08-07')

    expect(deadline.label).toBe('距离结束剩余 7 天')
    expect(deadline.tone).toBe('action')
    expect(deadline.remainingDays).toBe(7)
  })

  it('截止当天和已结束只提供日期信息，不产生风险状态', () => {
    expect(calculateSprintDeadline(baseInput, '2026-08-12').tone).toBe('action')
    expect(calculateSprintDeadline(baseInput, '2026-08-14')).toMatchObject({
      label: '今天截止',
      tone: 'action',
      remainingDays: 0,
      percent: 100,
    })
    expect(calculateSprintDeadline(baseInput, '2026-08-17')).toMatchObject({
      label: '已结束 3 天',
      tone: 'action',
      remainingDays: -3,
      percent: 100,
    })
  })

  it('关闭的迭代不再强调逾期', () => {
    expect(calculateSprintDeadline({ ...baseInput, status: 'closed' }, '2026-08-17'))
      .toMatchObject({
        label: '已截止',
        tone: 'success',
        percent: 100,
      })
  })

  it('只有截止日时仍显示倒计时但不显示时间进度', () => {
    expect(calculateSprintDeadline({
      startDate: null,
      endDate: '2026-08-14',
      status: 'active',
    }, '2026-08-10')).toEqual({
      label: '距离结束剩余 4 天',
      tone: 'action',
      remainingDays: 4,
      percent: null,
      showProgress: false,
    })
  })

  it('未设置截止日和非法日期必须显式提示', () => {
    expect(calculateSprintDeadline({
      ...baseInput,
      endDate: null,
    }, '2026-08-10').label).toBe('未设置截止')

    expect(calculateSprintDeadline({
      ...baseInput,
      startDate: '2026-08-20',
    }, '2026-08-10').label).toBe('日期无效')

    expect(calculateSprintDeadline({
      ...baseInput,
      endDate: '2026-02-30',
    }, '2026-08-10').label).toBe('日期无效')
  })

  it('当前日期按北京时间计算', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-10T17:00:00Z'))

    expect(getBeijingToday()).toBe('2026-08-11')
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
