// src/workspace/App.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useReaderSettings } from './hooks/useReaderSettings'
import type { ReaderSettings } from './hooks/useReaderSettings'
import { useSettings } from './hooks/useSettings'
import { useOutline } from './hooks/useOutline'
import { createClaudeProvider } from './providers/claude'
import { createOpenAIProvider } from './providers/openai'
import { createGeminiProvider } from './providers/gemini'
import { createDeepseekProvider } from './providers/deepseek'
import type { AIProvider, CapturedPage, ProviderName } from './providers/types'
import type { HighlightColor } from './hooks/useHighlights'
import { downloadPageAsMarkdown } from './utils/htmlToMarkdown'
import ArticlePanel from './components/ArticlePanel'
import ChatPanel from './components/ChatPanel'
import SettingsPage from './components/SettingsPage'
import OutlinePanel from './components/OutlinePanel'
import Header from './components/Header'

function getProvider(name: string, apiKey: string, model: string): AIProvider {
  switch (name) {
    case 'openai':   return createOpenAIProvider(apiKey, model)
    case 'gemini':   return createGeminiProvider(apiKey, model)
    case 'deepseek': return createDeepseekProvider(apiKey, model)
    default:         return createClaudeProvider(apiKey, model)
  }
}

export default function App() {
  const { readerSettings, updateReaderSettings, loaded: readerLoaded } = useReaderSettings()
  const { settings, saveSettings, loaded: settingsLoaded } = useSettings()
  const [page, setPage] = useState<CapturedPage | null>(null)
  const [pageLoaded, setPageLoaded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [defaultHighlightColor, setDefaultHighlightColor] = useState<HighlightColor>('yellow')
  const readerSnapshot = useRef<ReaderSettings | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [pendingAIMessage, setPendingAIMessage] = useState<string | null>(null)
  const [chatWidth, setChatWidth] = useState(340)
  const chatWidthRef = useRef(340)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    chrome.storage.local.get('defaultHighlightColor').then((data) => {
      if (data.defaultHighlightColor) {
        setDefaultHighlightColor(data.defaultHighlightColor as HighlightColor)
      }
    })
  }, [])

  const showToast = (msg: string, ms = 2500) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }
  const articleBodyRef = useRef<HTMLDivElement>(null)
  const [outlineOpen, setOutlineOpen] = useState(true)
  const { items: outlineItems, activeId: outlineActiveId } = useOutline(articleBodyRef, page)

  const handleOpenClaude = () => {
    if (!page) return
    const prompt = `I'm reading an article and want to discuss it with you.\n\nTitle: ${page.title}\nSource: ${page.url}\n\n---\n\n${page.textContent.slice(0, 6000)}`
    navigator.clipboard.writeText(prompt)
    showToast('Article copied — paste into Claude to start', 3500)
    chrome.windows.create({ url: 'https://claude.ai', type: 'popup', width: 520, height: 900 })
  }

  const handleDownload = async () => {
    if (!page) return
    const savedTo = await downloadPageAsMarkdown(page)
    if (savedTo) showToast(`Saved to ${savedTo}`)
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
  const currentModel = settings.selectedModels[settings.selectedProvider]
  const provider = currentKey
    ? getProvider(settings.selectedProvider, currentKey, currentModel)
    : null

  const handleSettingsOpen = () => {
    readerSnapshot.current = readerSettings
    setSettingsOpen(true)
  }

  const handleSettingsCancel = () => {
    if (readerSnapshot.current) {
      updateReaderSettings(readerSnapshot.current)
    }
    setSettingsOpen(false)
  }

  const handleSettingsSave = (
    apiKeys: Record<ProviderName, string>,
    selectedProvider: ProviderName,
    color: HighlightColor,
    selectedModels: Record<ProviderName, string>,
  ) => {
    saveSettings({ apiKeys, selectedProvider, selectedModels })
    setDefaultHighlightColor(color)
    chrome.storage.local.set({ defaultHighlightColor: color })
    setSettingsOpen(false)
  }

  return (
    <div className="app">
      <Header
        page={page}
        outlineOpen={outlineOpen}
        hasOutline={outlineItems.length > 0}
        onOutlineToggle={() => setOutlineOpen((o) => !o)}
        onSettingsOpen={handleSettingsOpen}
        onDownload={handleDownload}
        onOpenClaude={handleOpenClaude}
        readerSettings={readerSettings}
        onReaderSettingsChange={updateReaderSettings}
      />
      {page?.isShort && (
        <div className="warning-banner">Short content — AI responses may be limited.</div>
      )}
      <main className="workspace-layout">
        <OutlinePanel items={outlineItems} activeId={outlineActiveId} isOpen={outlineOpen} />
        <ArticlePanel
          page={page}
          onAskAI={handleAskAI}
          articleBodyRef={articleBodyRef}
          defaultHighlightColor={defaultHighlightColor}
        />
        {chatOpen && (
          <div className="chat-panel-wrapper" style={{ width: chatWidth }}>
            <div className="chat-resize-handle" onMouseDown={handleResizeStart} />
            <ChatPanel
              page={page}
              provider={provider}
              settings={settings}
              onClose={() => { setChatOpen(false); setPendingAIMessage(null) }}
              onSettingsOpen={handleSettingsOpen}
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
      {toast && <div className="claude-toast">{toast}</div>}
      {settingsOpen && (
        <SettingsPage
          settings={settings}
          readerSettings={readerSettings}
          defaultHighlightColor={defaultHighlightColor}
          onReaderChange={updateReaderSettings}
          onSave={handleSettingsSave}
          onCancel={handleSettingsCancel}
        />
      )}
    </div>
  )
}
