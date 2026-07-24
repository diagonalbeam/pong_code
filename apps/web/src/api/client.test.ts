import { describe, expect, it } from 'vitest'
import { http } from './client'

describe('API 客户端', () => {
  it('通过响应拦截器直接返回业务数据', async () => {
    const result = await http.get<{ success: boolean }>('/test', {
      adapter: async config => ({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }),
    })

    expect(result).toEqual({ success: true })
  })
})
