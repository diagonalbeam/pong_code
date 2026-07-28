import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { getUserAvatarStyle } from '@/shared/avatar-color'
import WorklogList from './worklog-list.vue'

enableAutoUnmount(afterEach)

describe('WorklogList', () => {
  it('使用与头部一致的用户名颜色算法渲染 avatar', () => {
    const wrapper = mount(WorklogList, {
      props: {
        logs: [
          {
            id: 1,
            user_id: 9,
            user_name: '李海斌',
            date: '2026-06-30',
            created_at: null,
            hours: 1,
            description: '',
            can_delete: true,
          },
          {
            id: 2,
            user_id: 9,
            user_name: '李海斌',
            date: '2026-06-29',
            created_at: null,
            hours: 0.25,
            description: '联调',
            can_delete: false,
          },
        ],
      },
      global: {
        stubs: {
          ElAvatar: {
            props: ['size', 'style'],
            template: '<span data-testid="worklog-avatar" :style="style"><slot /></span>',
          },
          ElButton: true,
          ElEmpty: true,
          ElIcon: true,
        },
      },
    })

    const expected = getUserAvatarStyle('李海斌')
    const avatars = wrapper.findAll('[data-testid="worklog-avatar"]')
    expect(avatars).toHaveLength(2)
    expect(avatars[0].text()).toBe('李')
    expect(avatars[0].attributes('style')).toContain(`background-color: ${hexToRgb(expected.backgroundColor)}`)
    expect(avatars[0].attributes('style')).toContain(`color: ${hexToRgb(expected.color)}`)
    expect(avatars[1].attributes('style')).toBe(avatars[0].attributes('style'))
  })

  it('有说明时独立成块展示，无说明时只显示日期', () => {
    const wrapper = mount(WorklogList, {
      props: {
        logs: [
          {
            id: 1,
            user_id: 9,
            user_name: '李海斌',
            date: '2026-06-30',
            created_at: null,
            hours: 1,
            description: '',
            can_delete: false,
          },
          {
            id: 2,
            user_id: 9,
            user_name: '李海斌',
            date: '2026-06-29',
            created_at: null,
            hours: 0.25,
            description: '这是一段很长的工时说明，需要独立展示',
            can_delete: false,
          },
        ],
      },
      global: {
        stubs: {
          ElAvatar: true,
          ElButton: true,
          ElEmpty: true,
          ElIcon: true,
        },
      },
    })

    const articles = wrapper.findAll('article')
    expect(articles[0].text()).toContain('2026-06-30')
    expect(articles[0].text()).not.toContain('无说明')
    expect(articles[0].find('[data-testid="worklog-description"]').exists()).toBe(false)

    const description = articles[1].get('[data-testid="worklog-description"]')
    expect(description.text()).toBe('这是一段很长的工时说明，需要独立展示')
    expect(description.classes()).toContain('ml-12')
  })
})

function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}
