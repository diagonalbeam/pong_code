import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  login as loginRequest,
  logout as logoutRequest,
  status,
} from '@/api/auth'
import type { User } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const isAuthenticated = computed(() => Boolean(user.value))

  async function restore() {
    if (initialized.value)
      return
    loading.value = true
    try {
      const result = await status()
      user.value = result.authenticated ? result.user ?? null : null
    }
    finally {
      initialized.value = true
      loading.value = false
    }
  }

  async function login(payload: { username: string; password: string; remember_me: boolean }) {
    const result = await loginRequest(payload)
    user.value = result.user
    return result
  }

  async function logout() {
    await logoutRequest()
    user.value = null
  }

  function setUser(nextUser: User | null) {
    user.value = nextUser
    initialized.value = true
  }

  return { user, initialized, loading, isAuthenticated, restore, login, logout, setUser }
})
