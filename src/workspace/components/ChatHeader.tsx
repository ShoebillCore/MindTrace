import type { AIProvider } from '../providers/types'

interface ChatHeaderProps {
  provider: AIProvider
  onClose: () => void
}

export default function ChatHeader({ provider, onClose }: ChatHeaderProps) {
  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <span className="chat-status-dot" />
        <span className="chat-provider-name">{provider.name}</span>
        <span className="chat-model-badge">{provider.model}</span>
      </div>
      <button className="chat-close-btn" onClick={onClose} aria-label="Close chat">
        ✕
      </button>
    </div>
  )
}
