import { useState, useRef, useEffect } from 'react'
import type { CapturedPage, Settings, ProviderName } from '../providers/types'
import type { ReaderSettings } from '../hooks/useReaderSettings'
import ReaderSettingsPopup from './ReaderSettingsPopup'

interface HeaderProps {
  page: CapturedPage | null
  settings: Settings
  outlineOpen: boolean
  hasOutline: boolean
  onOutlineToggle: () => void
  onProviderChange: (p: ProviderName) => void
  onSettingsOpen: () => void
  onDownload: () => void
  readerSettings: ReaderSettings
  onReaderSettingsChange: (next: Partial<ReaderSettings>) => void
}

const PROVIDERS: { value: ProviderName; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
]

export default function Header({
  page,
  settings,
  outlineOpen,
  hasOutline,
  onOutlineToggle,
  onProviderChange,
  onSettingsOpen,
  onDownload,
  readerSettings,
  onReaderSettingsChange,
}: HeaderProps) {
  const [popupOpen, setPopupOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popupOpen) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopupOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [popupOpen])

  return (
    <header className="header">
      <div className="header-left">
        {hasOutline && (
        <button
          className="outline-toggle-btn"
          onClick={onOutlineToggle}
          title={outlineOpen ? 'Hide outline' : 'Show outline'}
          aria-label="Toggle outline panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="3" y1="4" x2="13" y2="4" />
            <line x1="6" y1="8" x2="13" y2="8" />
            <line x1="6" y1="12" x2="13" y2="12" />
            <line x1="3" y1="8" x2="3" y2="8" strokeWidth="2" />
            <line x1="3" y1="12" x2="3" y2="12" strokeWidth="2" />
          </svg>
        </button>
        )}
      </div>

      <div className="header-right">
        <select
          className="provider-select"
          value={settings.selectedProvider}
          onChange={(e) => onProviderChange(e.target.value as ProviderName)}
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <div ref={containerRef} style={{ position: 'relative' }}>
          <button
            className="reader-settings-btn"
            onClick={() => setPopupOpen((o) => !o)}
            disabled={!page}
            title="Reading settings"
            aria-label="Reading settings"
          >
            Aa
          </button>
          {popupOpen && (
            <ReaderSettingsPopup
              settings={readerSettings}
              onChange={onReaderSettingsChange}
            />
          )}
        </div>

        <button
          className="download-btn"
          onClick={onDownload}
          disabled={!page}
          title="Download article as Markdown (.md file)"
          aria-label="Download article as Markdown"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 1.5v8" />
            <path d="M4.5 7l3 2.5 3-2.5" />
            <path d="M2.5 12.5h10" />
          </svg>
        </button>

        <button
          className="settings-btn"
          onClick={onSettingsOpen}
          title="Settings"
        >
          ⚙
        </button>
      </div>
    </header>
  )
}
