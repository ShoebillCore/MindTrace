import { useState, useEffect } from 'react'
import type { Settings, ProviderName } from '../providers/types'

const DEFAULT_SETTINGS: Settings = {
  selectedProvider: 'claude',
  apiKeys: { claude: '', openai: '', gemini: '' },
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    chrome.storage.local
      .get(['selectedProvider', 'apiKeys'])
      .then((data) => {
        setSettings({
          selectedProvider:
            (data.selectedProvider as ProviderName) ??
            DEFAULT_SETTINGS.selectedProvider,
          apiKeys:
            (data.apiKeys as Record<ProviderName, string>) ??
            DEFAULT_SETTINGS.apiKeys,
        })
        setLoaded(true)
      })
  }, [])

  const saveSettings = (next: Partial<Settings>) => {
    const merged = { ...settings, ...next }
    setSettings(merged)
    chrome.storage.local.set({
      selectedProvider: merged.selectedProvider,
      apiKeys: merged.apiKeys,
    })
  }

  return { settings, saveSettings, loaded }
}
