import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from './index.vue'

const apiMocks = vi.hoisted(() => ({
  getCliToken: vi.fn(),
  rotateCliToken: vi.fn(),
}))

const elementMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  confirm: vi.fn(),
}))

enableAutoUnmount(afterEach)

vi.mock('@/api/auth', () => ({
  getCliToken: apiMocks.getCliToken,
  rotateCliToken: apiMocks.rotateCliToken,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { username: 'ada', email: 'ada@example.com' },
    setUser: vi.fn(),
  }),
}))

vi.mock('element-plus', () => ({
  ElMessage: elementMocks,
  ElMessageBox: elementMocks,
}))

const PassThroughStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, slots.default?.())
  },
})

const ButtonStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('button', attrs, slots.default?.())
  },
})

const InputStub = defineComponent({
  inheritAttrs: false,
  props: { modelValue: { type: String, default: '' } },
  setup(props, { attrs }) {
    return () => h('input', {
      ...attrs,
      value: props.modelValue,
      readonly: true,
    })
  },
})

function mountProfile() {
  return mount(ProfilePage, {
    global: {
      stubs: {
        ElButton: ButtonStub,
        ElForm: PassThroughStub,
        ElFormItem: PassThroughStub,
        ElInput: InputStub,
        PageHeader: PassThroughStub,
      },
    },
  })
}

describe('个人资料页', () => {
  beforeEach(() => {
    apiMocks.getCliToken.mockReset().mockResolvedValue({ cli_token: 'current-token' })
    apiMocks.rotateCliToken.mockReset()
    elementMocks.success.mockClear()
    elementMocks.error.mockClear()
    elementMocks.confirm.mockReset()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
  })

  it('加载并展示 CLI Token，支持复制', async () => {
    const wrapper = mountProfile()
    await flushPromises()

    const input = wrapper.get('[data-testid="profile-token-input"]')
    expect(input.attributes('value')).toBe('current-token')

    await wrapper.get('[data-testid="profile-token-copy-button"]').trigger('click')

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('current-token')
    expect(elementMocks.success).toHaveBeenCalledWith('CLI Token 已复制')
  })

  it('确认后轮换 CLI Token', async () => {
    elementMocks.confirm.mockResolvedValue(undefined)
    apiMocks.rotateCliToken.mockResolvedValue({ success: true, cli_token: 'next-token' })

    const wrapper = mountProfile()
    await flushPromises()
    await wrapper.get('[data-testid="profile-token-rotate-button"]').trigger('click')
    await flushPromises()

    expect(elementMocks.confirm).toHaveBeenCalled()
    expect(apiMocks.rotateCliToken).toHaveBeenCalled()
    expect(wrapper.get('[data-testid="profile-token-input"]').attributes('value')).toBe('next-token')
    expect(elementMocks.success).toHaveBeenCalledWith('CLI Token 已重新生成')
  })
})
