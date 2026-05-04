import type { AIProvider, CapturedPage, Settings, ProviderName } from '../providers/types'

const PROVIDERS: { value: ProviderName; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
]

interface ChatHeaderProps {
  provider: AIProvider | null
  settings: Settings
  page: CapturedPage | null
  onClose: () => void
  onProviderChange: (p: ProviderName) => void
  onSettingsOpen: () => void
  onDownload: () => void
}

export default function ChatHeader({
  provider, settings, page,
  onClose, onProviderChange, onSettingsOpen, onDownload,
}: ChatHeaderProps) {
  return (
    <div className="chat-header">
      <div className="chat-header-toolbar">
        <span className="chat-header-logo"></span>
        <div className="chat-header-controls">
          <select
            className="provider-select"
            value={settings.selectedProvider}
            onChange={(e) => onProviderChange(e.target.value as ProviderName)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button
            className="download-btn"
            onClick={onDownload}
            disabled={!page}
            title="Download as Markdown"
            aria-label="Download"
          >
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.5 1.5v8" />
              <path d="M4.5 7l3 2.5 3-2.5" />
              <path d="M2.5 12.5h10" />
            </svg>
          </button>
          <button className="settings-btn" onClick={onSettingsOpen} title="Settings">⚙</button>
          <button className="chat-close-btn" onClick={onClose} aria-label="Close chat">✕</button>
        </div>
      </div>

      {provider && (
        <div className="chat-header-status">
          <span className="chat-status-dot" />
          <span className="chat-provider-name">{provider.name}</span>
          <span className="chat-model-badge">{provider.model}</span>
        </div>
      )}
    </div>
  )
}
