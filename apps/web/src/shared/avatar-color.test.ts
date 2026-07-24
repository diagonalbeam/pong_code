import { describe, expect, it } from 'vitest'
import { getUserAvatarColor } from './avatar-color'

describe('用户头像颜色', () => {
  it('使用用户名稳定映射到固定色板', () => {
    expect(getUserAvatarColor('guihaihuan')).toEqual({
      background: '#5856d6',
      foreground: '#ffffff',
    })
    expect(getUserAvatarColor('guihaihuan')).toEqual(getUserAvatarColor('guihaihuan'))
  })

  it('为空用户名返回中性默认色', () => {
    expect(getUserAvatarColor('  ')).toEqual({
      background: '#d2d2d7',
      foreground: '#ffffff',
    })
  })
})
