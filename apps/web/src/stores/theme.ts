import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'pongcode:theme'

function preferredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark')
    return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('light')
  const isDark = computed(() => theme.value === 'dark')

  function apply(next: Theme, persist = true) {
    theme.value = next
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.documentElement.dataset.theme = next
    document.documentElement.style.colorScheme = next
    if (persist)
      localStorage.setItem(STORAGE_KEY, next)
  }

  function initialize() {
    apply(preferredTheme(), Boolean(localStorage.getItem(STORAGE_KEY)))
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', (event) => {
      if (!localStorage.getItem(STORAGE_KEY))
        apply(event.matches ? 'dark' : 'light', false)
    })
  }

  function toggle() {
    apply(isDark.value ? 'light' : 'dark')
  }

  return { theme, isDark, initialize, toggle }
})
