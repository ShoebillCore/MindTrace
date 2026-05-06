import { useState, useEffect } from 'react'
import type { Settings, ProviderName } from '../providers/types'

const DEFAULT_SETTINGS: Settings = {
  selectedProvider: 'claude',
  apiKeys: { claude: '', openai: '', gemini: '', deepseek: '' },
  selectedModels: {
    claude: 'claude-sonnet-4-6',
    openai: 'gpt-4o',
    gemini: 'gemini-2.0-flash',
    deepseek: 'deepseek-chat',
  },
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    chrome.storage.local
      .get(['selectedProvider', 'apiKeys', 'selectedModels'])
      .then((data) => {
        setSettings({
          selectedProvider:
            (data.selectedProvider as ProviderName) ??
            DEFAULT_SETTINGS.selectedProvider,
          apiKeys: {
            ...DEFAULT_SETTINGS.apiKeys,
            ...(data.apiKeys as Record<ProviderName, string> ?? {}),
          },
          selectedModels: {
            ...DEFAULT_SETTINGS.selectedModels,
            ...(data.selectedModels as Record<ProviderName, string> ?? {}),
          },
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
      selectedModels: merged.selectedModels,
    })
  }

  return { settings, saveSettings, loaded }
}
