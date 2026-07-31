import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MarkdownRenderer from './markdown-renderer.vue'

describe('MarkdownRenderer', () => {
  it('provides a constrained document presentation for detail dialogs', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        source: '# 缺陷描述\n\n![截图](/static/uploads/demo.png)',
        document: true,
      },
    })

    expect(wrapper.classes()).toContain('markdown-renderer--document')
    expect(wrapper.get('img').attributes()).toMatchObject({
      loading: 'lazy',
      src: '/static/uploads/demo.png',
    })
  })
})
