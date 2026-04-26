import { useEffect, useState } from 'react'
import { useTheme } from './hooks/useTheme'
import { useSettings } from './hooks/useSettings'
import { createClaudeProvider } from './providers/claude'
import { createOpenAIProvider } from './providers/openai'
import { createGeminiProvider } from './providers/gemini'
import type { AIProvider, CapturedPage } from './providers/types'
import Header from './components/Header'
import ArticlePanel from './components/ArticlePanel'
import WorkspacePanel from './components/WorkspacePanel'
import SettingsDrawer from './components/SettingsDrawer'

function getProvider(name: string, apiKey: string): AIProvider {
  switch (name) {
    case 'openai': return createOpenAIProvider(apiKey)
    case 'gemini': return createGeminiProvider(apiKey)
    default:       return createClaudeProvider(apiKey)
  }
}

export default function App() {
  const { theme, setTheme } = useTheme()
  const { settings, saveSettings, loaded: settingsLoaded } = useSettings()
  const [page, setPage] = useState<CapturedPage | null>(null)
  const [pageLoaded, setPageLoaded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    chrome.storage.session.get('capturedPage').then((data) => {
      setPage((data.capturedPage as CapturedPage) ?? null)
      setPageLoaded(true)
    })
  }, [])

  if (!pageLoaded || !settingsLoaded) {
    return <div className="loading">Loading…</div>
  }

  const currentKey = settings.apiKeys[settings.selectedProvider]
  const provider = currentKey
    ? getProvider(settings.selectedProvider, currentKey)
    : null

  return (
    <div className="app" data-theme={theme}>
      {page?.isShort && (
        <div className="warning-banner">
          Short content — AI responses may be limited.
        </div>
      )}
      <Header
        page={page}
        settings={settings}
        theme={theme}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onProviderChange={(p) => saveSettings({ selectedProvider: p })}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      <main className="workspace-layout">
        <ArticlePanel page={page} />
        <WorkspacePanel
          page={page}
          provider={provider}
          onSettingsOpen={() => setSettingsOpen(true)}
        />
      </main>
      {settingsOpen && (
        <SettingsDrawer
          settings={settings}
          onSave={(apiKeys) => saveSettings({ apiKeys })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
