import { useState, useEffect } from 'react'
import { THEMES } from '../themes'
import type { ColorScheme, Mode } from '../themes'

export type { ColorScheme, Mode }

export interface ReaderSettings {
  colorScheme: ColorScheme
  mode: Mode
  fontSize: number     // px, range 12–24, step 1
  contentWidth: number // %, range 30–90, step 5
}

const DEFAULT: ReaderSettings = {
  colorScheme: 'github',
  mode: 'light',
  fontSize: 15,
  contentWidth: 50,
}

export function applyReaderSettings(s: ReaderSettings): void {
  const root = document.documentElement
  const tokens = THEMES[s.colorScheme][s.mode]
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v)
  root.style.setProperty('--article-font-size', `${s.fontSize}px`)
  root.style.setProperty('--content-width', `${s.contentWidth}%`)
  root.setAttribute('data-theme', s.mode)
}

export function useReaderSettings() {
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(DEFAULT)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    chrome.storage.local.get('readerSettings').then((data) => {
      const merged: ReaderSettings = { ...DEFAULT, ...(data.readerSettings ?? {}) }
      setReaderSettings(merged)
      applyReaderSettings(merged)
      setLoaded(true)
    })
  }, [])

  const updateReaderSettings = (next: Partial<ReaderSettings>) => {
    const merged = { ...readerSettings, ...next }
    setReaderSettings(merged)
    applyReaderSettings(merged)
    chrome.storage.local.set({ readerSettings: merged })
  }

  return { readerSettings, updateReaderSettings, loaded }
}
