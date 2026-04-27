import { useEffect, useRef } from 'react'
import type { Message } from '../hooks/useChatHistory'
import ChatMessage from './ChatMessage'

export default function MessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="message-list">
      {messages.length === 0 && (
        <p className="message-list-empty">
          Use a quick action above or ask anything about this article.
        </p>
      )}
      {messages.map((m) => (
        <ChatMessage key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
