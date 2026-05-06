import { useState, useRef, useEffect } from 'react'
import type { CapturedPage } from '../providers/types'
import type { ReaderSettings } from '../hooks/useReaderSettings'
import ReaderSettingsPopup from './ReaderSettingsPopup'

interface HeaderProps {
  page: CapturedPage | null
  outlineOpen: boolean
  hasOutline: boolean
  onOutlineToggle: () => void
  onSettingsOpen: () => void
  onDownload: () => void
  onOpenClaude: () => void
  readerSettings: ReaderSettings
  onReaderSettingsChange: (next: Partial<ReaderSettings>) => void
}

export default function Header({
  page,
  outlineOpen,
  hasOutline,
  onOutlineToggle,
  onSettingsOpen,
  onDownload,
  onOpenClaude,
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
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="2" y1="3.5" x2="13" y2="3.5" />
            <line x1="5" y1="7.5" x2="13" y2="7.5" />
            <line x1="5" y1="11.5" x2="13" y2="11.5" />
            <circle cx="2.5" cy="7.5" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="2.5" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
          </svg>
        </button>
        )}
      </div>

      <div className="header-right">
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
          title="Download as Markdown"
          aria-label="Download article as Markdown"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7.5" y1="1.5" x2="7.5" y2="9.5" />
            <polyline points="4.5,7 7.5,10 10.5,7" />
            <line x1="2.5" y1="13" x2="12.5" y2="13" />
          </svg>
        </button>

        <button
          className="settings-btn"
          onClick={onSettingsOpen}
          title="Settings"
          aria-label="Settings"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="2" y1="4" x2="13" y2="4" />
            <line x1="2" y1="7.5" x2="13" y2="7.5" />
            <line x1="2" y1="11" x2="13" y2="11" />
            <line x1="4.5" y1="2.5" x2="4.5" y2="5.5" />
            <line x1="9.5" y1="6" x2="9.5" y2="9" />
          </svg>
        </button>
      </div>
    </header>
  )
}
