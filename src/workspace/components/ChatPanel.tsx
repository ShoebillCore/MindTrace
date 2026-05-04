import { useEffect, useRef } from 'react'
import { useStream } from '../hooks/useStream'
import { useChatHistory } from '../hooks/useChatHistory'
import type { Message } from '../hooks/useChatHistory'
import type { AIProvider, CapturedPage, Settings, ProviderName } from '../providers/types'
import type { Theme } from '../hooks/useTheme'
import ChatHeader from './ChatHeader'
import QuickActions from './QuickActions'
import MessageList from './MessageList'
import ChatInput from './ChatInput'

const CHAT_SYSTEM_PROMPT = (articleText: string) =>
  `You are a helpful reading assistant. Answer questions about the following article concisely and accurately:\n\n${articleText.slice(0, 8000)}`

interface ChatPanelProps {
  page: CapturedPage | null
  provider: AIProvider | null
  settings: Settings
  theme: Theme
  onClose: () => void
  onThemeToggle: () => void
  onProviderChange: (p: ProviderName) => void
  onSettingsOpen: () => void
  onDownload: () => void
  initialMessage?: string | null
}

export default function ChatPanel({
  page, provider, settings, theme,
  onClose, onThemeToggle, onProviderChange, onSettingsOpen, onDownload,
  initialMessage,
}: ChatPanelProps) {
  const { messages, addUserMessage, addAssistantMessage, updateMessage, finalizeMessage, setStreamingError } =
    useChatHistory()
  const stream = useStream(provider)
  const assistantIdRef = useRef<string | null>(null)
  const isStreaming = stream.status === 'loading' || stream.status === 'streaming'

  useEffect(() => {
    const id = assistantIdRef.current
    if (!id) return
    if (stream.status === 'done') {
      updateMessage(id, stream.text)
      finalizeMessage(id)
      assistantIdRef.current = null
    } else if (stream.status === 'error') {
      setStreamingError(id, stream.error ?? 'Something went wrong.')
      assistantIdRef.current = null
    } else {
      updateMessage(id, stream.text)
    }
  }, [stream.text, stream.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickAction = (label: NonNullable<Message['label']>, systemPrompt: string) => {
    if (!page || isStreaming) return
    const id = addAssistantMessage(label)
    assistantIdRef.current = id
    stream.start(systemPrompt, page.textContent.slice(0, 8000))
  }

  const handleUserMessage = (text: string) => {
    if (!page || isStreaming || !text.trim()) return
    addUserMessage(text)
    const id = addAssistantMessage()
    assistantIdRef.current = id
    stream.start(CHAT_SYSTEM_PROMPT(page.textContent), text)
  }

  const headerProps = { settings, theme, page, onClose, onThemeToggle, onProviderChange, onSettingsOpen, onDownload }

  if (!provider) {
    return (
      <div className="chat-panel">
        <ChatHeader provider={null} {...headerProps} />
        <div className="no-key-prompt">
          <p>Enter an API key to activate the AI workspace.</p>
          <button onClick={onSettingsOpen}>Open Settings</button>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-panel">
      <ChatHeader provider={provider} {...headerProps} />
      <QuickActions disabled={isStreaming || !page} onAction={handleQuickAction} />
      <MessageList messages={messages} />
      <ChatInput onSend={handleUserMessage} disabled={isStreaming || !page} initialValue={initialMessage ?? undefined} />
    </div>
  )
}
