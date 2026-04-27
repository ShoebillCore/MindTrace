// src/workspace/App.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from './hooks/useTheme'
import { useSettings } from './hooks/useSettings'
import { createClaudeProvider } from './providers/claude'
import { createOpenAIProvider } from './providers/openai'
import { createGeminiProvider } from './providers/gemini'
import type { AIProvider, CapturedPage } from './providers/types'
import { downloadPageAsMarkdown } from './utils/htmlToMarkdown'
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
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingAIMessage, setPendingAIMessage] = useState<string | null>(null)
  const [chatWidth, setChatWidth] = useState(340)
  const chatWidthRef = useRef(340)

  const handleAskAI = (text: string) => {
    setChatOpen(true)
    setPendingAIMessage(text)
  }

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = chatWidthRef.current

    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX
      const next = Math.min(640, Math.max(260, startWidth + delta))
      setChatWidth(next)
      chatWidthRef.current = next
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

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
        onDownload={() => page && downloadPageAsMarkdown(page)}
      />
      <main className="workspace-layout">
        <ArticlePanel page={page} onAskAI={handleAskAI} />
        {chatOpen && (
          <div className="chat-panel-wrapper" style={{ width: chatWidth }}>
            <div className="chat-resize-handle" onMouseDown={handleResizeStart} />
            <ChatPanel
              page={page}
              provider={provider}
              onClose={() => { setChatOpen(false); setPendingAIMessage(null) }}
              onSettingsOpen={() => setSettingsOpen(true)}
              initialMessage={pendingAIMessage}
            />
          </div>
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
