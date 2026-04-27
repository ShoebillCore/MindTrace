import type { Message } from '../hooks/useChatHistory'

const LABEL_COLORS: Record<string, string> = {
  Summary: 'var(--accent-purple)',
  'Deep Insight': 'var(--accent-blue)',
  Questions: 'var(--accent-green)',
}

export default function ChatMessage({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="chat-message chat-message--user">
        <p>{message.content}</p>
      </div>
    )
  }

  return (
    <div className="chat-message chat-message--assistant">
      {message.label && (
        <div
          className="chat-message-label"
          style={{ color: LABEL_COLORS[message.label] ?? 'var(--text-muted)' }}
        >
          {message.label}
        </div>
      )}
      {message.isStreaming && !message.content ? (
        <div className="chat-skeleton">
          <div className="skeleton-line" style={{ width: '90%' }} />
          <div className="skeleton-line" style={{ width: '75%' }} />
          <div className="skeleton-line" style={{ width: '83%' }} />
        </div>
      ) : (
        <p className="chat-message-content">{message.content}</p>
      )}
    </div>
  )
}
