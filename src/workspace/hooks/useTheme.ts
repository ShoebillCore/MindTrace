import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    chrome.storage.local.get('theme').then((data) => {
      const saved = data.theme as Theme | undefined
      const initial: Theme = saved === 'light' ? 'light' : 'dark'
      setThemeState(initial)
      document.documentElement.setAttribute('data-theme', initial)
    })
  }, [])

  const setTheme = (next: Theme) => {
    setThemeState(next)
    document.documentElement.setAttribute('data-theme', next)
    chrome.storage.local.set({ theme: next })
  }

  return { theme, setTheme }
}
