// src/workspace/App.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useReaderSettings } from './hooks/useReaderSettings'
import { useSettings } from './hooks/useSettings'
import { useOutline } from './hooks/useOutline'
import { createClaudeProvider } from './providers/claude'
import { createOpenAIProvider } from './providers/openai'
import { createGeminiProvider } from './providers/gemini'
import type { AIProvider, CapturedPage } from './providers/types'
import { downloadPageAsMarkdown } from './utils/htmlToMarkdown'
import ArticlePanel from './components/ArticlePanel'
import ChatPanel from './components/ChatPanel'
import SettingsDrawer from './components/SettingsDrawer'
import OutlinePanel from './components/OutlinePanel'
import Header from './components/Header'

function getProvider(name: string, apiKey: string): AIProvider {
  switch (name) {
    case 'openai': return createOpenAIProvider(apiKey)
    case 'gemini': return createGeminiProvider(apiKey)
    default:       return createClaudeProvider(apiKey)
  }
}

export default function App() {
  const { readerSettings, updateReaderSettings, loaded: readerLoaded } = useReaderSettings()
  const { settings, saveSettings, loaded: settingsLoaded } = useSettings()
  const [page, setPage] = useState<CapturedPage | null>(null)
  const [pageLoaded, setPageLoaded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingAIMessage, setPendingAIMessage] = useState<string | null>(null)
  const [chatWidth, setChatWidth] = useState(340)
  const chatWidthRef = useRef(340)
  const [claudeToast, setClaudeToast] = useState(false)
  const articleBodyRef = useRef<HTMLDivElement>(null)
  const [outlineOpen, setOutlineOpen] = useState(true)
  const { items: outlineItems, activeId: outlineActiveId } = useOutline(articleBodyRef, page)

  const handleOpenClaude = () => {
    if (!page) return
    const prompt = `I'm reading an article and want to discuss it with you.\n\nTitle: ${page.title}\nSource: ${page.url}\n\n---\n\n${page.textContent.slice(0, 6000)}`
    navigator.clipboard.writeText(prompt)
    setClaudeToast(true)
    setTimeout(() => setClaudeToast(false), 3500)
    chrome.windows.create({ url: 'https://claude.ai', type: 'popup', width: 520, height: 900 })
  }

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

  if (!pageLoaded || !settingsLoaded || !readerLoaded) {
    return <div className="loading">Loading…</div>
  }

  const currentKey = settings.apiKeys[settings.selectedProvider]
  const provider = currentKey
    ? getProvider(settings.selectedProvider, currentKey)
    : null

  return (
    <div className="app">
      <Header
        page={page}
        settings={settings}
        outlineOpen={outlineOpen}
        hasOutline={outlineItems.length > 0}
        onOutlineToggle={() => setOutlineOpen((o) => !o)}
        onProviderChange={(p) => saveSettings({ selectedProvider: p })}
        onSettingsOpen={() => setSettingsOpen(true)}
        onDownload={() => page && downloadPageAsMarkdown(page)}
        onOpenClaude={handleOpenClaude}
        readerSettings={readerSettings}
        onReaderSettingsChange={updateReaderSettings}
      />
      {page?.isShort && (
        <div className="warning-banner">Short content — AI responses may be limited.</div>
      )}
      <main className="workspace-layout">
        <OutlinePanel items={outlineItems} activeId={outlineActiveId} isOpen={outlineOpen} />
        <ArticlePanel page={page} onAskAI={handleAskAI} articleBodyRef={articleBodyRef} />
        {chatOpen && (
          <div className="chat-panel-wrapper" style={{ width: chatWidth }}>
            <div className="chat-resize-handle" onMouseDown={handleResizeStart} />
            <ChatPanel
              page={page}
              provider={provider}
              settings={settings}
              onClose={() => { setChatOpen(false); setPendingAIMessage(null) }}
              onProviderChange={(p) => saveSettings({ selectedProvider: p })}
              onSettingsOpen={() => setSettingsOpen(true)}
              onDownload={() => page && downloadPageAsMarkdown(page)}
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
          [chat]
        </button>
      )}
      {claudeToast && (
        <div className="claude-toast">Article copied — paste into Claude to start</div>
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
