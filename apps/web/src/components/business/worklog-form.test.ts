import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import WorklogForm from './worklog-form.vue'

const PassThroughStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, slots.default?.())
  },
})

const InputStub = defineComponent({
  inheritAttrs: false,
  props: {
    type: String,
    modelValue: String,
  },
  setup(props, { attrs }) {
    return () => props.type === 'textarea'
      ? h('textarea', { ...attrs, value: props.modelValue })
      : h('input', { ...attrs, value: props.modelValue })
  },
})

describe('WorklogForm', () => {
  it('工时说明保持普通文本输入，不启用 Markdown 编辑器', () => {
    const wrapper = mount(WorklogForm, {
      global: {
        stubs: {
          ElButton: true,
          ElDatePicker: true,
          ElForm: PassThroughStub,
          ElFormItem: PassThroughStub,
          ElInput: InputStub,
          ElInputNumber: true,
        },
      },
    })

    const description = wrapper.get('textarea')
    expect(description.attributes()).toMatchObject({
      maxlength: '2000',
      placeholder: '输入说明（可选）',
    })
    expect(wrapper.find('.markdown-editor').exists()).toBe(false)
  })
})
