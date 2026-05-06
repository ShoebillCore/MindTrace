import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { Message } from '../hooks/useChatHistory'

marked.use({ gfm: true, breaks: true })

const LABEL_COLORS: Record<string, string> = {
  Summary: '#0060cc',
  'Deep Insight': '#6d28d9',
  Questions: '#15803d',
}

function renderMarkdown(content: string): string {
  return DOMPurify.sanitize(marked.parse(content) as string)
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
        <div
          className="chat-md"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
      )}
    </div>
  )
}
