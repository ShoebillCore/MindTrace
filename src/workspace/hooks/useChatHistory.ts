import { useState, useRef } from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  label?: 'Summary' | 'Deep Insight' | 'Questions'
  isStreaming?: boolean
}

export function useChatHistory() {
  const [messages, setMessages] = useState<Message[]>([])
  const counter = useRef(0)

  const nextId = () => String(++counter.current)

  const addUserMessage = (content: string): string => {
    const id = nextId()
    setMessages((prev) => [...prev, { id, role: 'user', content }])
    return id
  }

  const addAssistantMessage = (label?: Message['label']): string => {
    const id = nextId()
    setMessages((prev) => [
      ...prev,
      { id, role: 'assistant', content: '', label, isStreaming: true },
    ])
    return id
  }

  const updateMessage = (id: string, content: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)))
  }

  const finalizeMessage = (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isStreaming: false } : m)))
  }

  const setStreamingError = (id: string, error: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: error, isStreaming: false } : m))
    )
  }

  return { messages, addUserMessage, addAssistantMessage, updateMessage, finalizeMessage, setStreamingError }
}
