import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import EntityIdBadge from './entity-id-badge.vue'

enableAutoUnmount(afterEach)

describe('EntityIdBadge', () => {
  it('渲染实体名称和等宽 ID', () => {
    const wrapper = mount(EntityIdBadge, {
      props: {
        id: 10,
        entity: '迭代',
        size: 'md',
      },
    })

    expect(wrapper.attributes('aria-label')).toBe('迭代 ID 10')
    expect(wrapper.get('.pc-id-badge__label').text()).toBe('ID')
    expect(wrapper.get('.pc-id-badge__value').text()).toBe('10')
    expect(wrapper.classes()).toContain('pc-id-badge--md')
  })
})
