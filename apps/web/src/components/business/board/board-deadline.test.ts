import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BoardDeadline from './board-deadline.vue'

function mountDeadline(props: Partial<InstanceType<typeof BoardDeadline>['$props']> = {}) {
  return mount(BoardDeadline, {
    props: {
      startDate: '2026-08-01',
      endDate: '2026-08-14',
      status: 'active',
      remainingEstimates: [
        { name: 'A', hours: 24 },
        { name: 'B', hours: 8 },
      ],
      bugCount: 1,
      today: '2026-08-10',
      ...props,
    },
  })
}

describe('看板截止倒计时', () => {
  it('展示倒计时和可访问的时间进度', () => {
    const wrapper = mountDeadline({ today: '2026-08-10' })
    const progress = wrapper.get('[role="progressbar"]')

    expect(wrapper.get('[data-testid="board-deadline"]').text()).toContain('距离结束剩余 4 天（有风险：A：24h，缺陷数量：1）')
    expect(progress.attributes('aria-valuenow')).toBe('69')
    expect(progress.attributes('aria-valuetext')).toContain('距离结束剩余 4 天')
    expect(progress.get('div').attributes('style')).toContain('width: 69%;')
  })

  it('剩余工时超过每日 6 小时产能的人员标记为逾期', () => {
    const wrapper = mountDeadline({
      remainingEstimates: [
        { name: 'A', hours: 24 },
        { name: 'B', hours: 30 },
      ],
      today: '2026-08-10',
    })

    expect(wrapper.get('[data-testid="board-deadline"]').text())
      .toContain('距离结束剩余 4 天（有风险：A：24h，逾期：B：30h，缺陷数量：1）')
  })

  it('没有工时风险时，临近截止也不使用风险颜色', () => {
    const wrapper = mountDeadline({
      startDate: '2026-08-01',
      endDate: '2026-08-12',
      remainingEstimates: [{ name: 'A', hours: 6 }],
      today: '2026-08-10',
    })
    const notice = wrapper.get('span')

    expect(wrapper.text()).toContain('距离结束剩余 2 天（预估剩余人员工时 A：6h，缺陷数量：1）')
    expect(notice.attributes('style')).toContain('color: var(--pc-action)')
  })

  it('只有截止日时隐藏时间进度条', () => {
    const wrapper = mountDeadline({
      startDate: null,
      endDate: '2026-08-14',
      today: '2026-08-10',
    })

    expect(wrapper.text()).toContain('距离结束剩余 4 天')
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })

  it('非法日期显示显式状态', () => {
    const wrapper = mountDeadline({ endDate: '2026-02-30' })

    expect(wrapper.text()).toContain('日期无效')
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })
})
