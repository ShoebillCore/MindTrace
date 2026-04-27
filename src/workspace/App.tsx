// src/workspace/App.tsx
import { useEffect, useState } from 'react'
import { useTheme } from './hooks/useTheme'
import { useSettings } from './hooks/useSettings'
import { createClaudeProvider } from './providers/claude'
import { createOpenAIProvider } from './providers/openai'
import { createGeminiProvider } from './providers/gemini'
import type { AIProvider, CapturedPage } from './providers/types'
import Header from './components/Header'
import ArticlePanel from './components/ArticlePanel'
import ChatPanel from './components/ChatPanel'
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
  const [chatOpen, setChatOpen] = useState(true)

  useEffect(() => {
    let done = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const handleChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === 'local' && changes.capturedPage?.newValue && !done) {
        done = true
        if (timer) clearTimeout(timer)
        chrome.storage.onChanged.removeListener(handleChange)
        setPage(changes.capturedPage.newValue as CapturedPage)
        setPageLoaded(true)
      }
    }

    chrome.storage.local.get('capturedPage').then((data) => {
      if (done) return
      if (data.capturedPage) {
        done = true
        setPage(data.capturedPage as CapturedPage)
        setPageLoaded(true)
        return
      }
      chrome.storage.onChanged.addListener(handleChange)
      timer = setTimeout(() => {
        if (!done) {
          done = true
          chrome.storage.onChanged.removeListener(handleChange)
          setPageLoaded(true)
        }
      }, 3000)
    })

    return () => {
      done = true
      if (timer) clearTimeout(timer)
      chrome.storage.onChanged.removeListener(handleChange)
    }
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
        <div className="warning-banner">Short content — AI responses may be limited.</div>
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
        {chatOpen && (
          <ChatPanel
            page={page}
            provider={provider}
            onClose={() => setChatOpen(false)}
            onSettingsOpen={() => setSettingsOpen(true)}
          />
        )}
      </main>
      {!chatOpen && page && (
        <button
          className="chat-open-btn"
          onClick={() => setChatOpen(true)}
          title="Open AI Chat"
        >
          💬
        </button>
      )}
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
