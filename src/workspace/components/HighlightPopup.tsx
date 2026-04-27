import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { HighlightColor } from '../hooks/useHighlights'

const COLORS: { color: HighlightColor; hex: string }[] = [
  { color: 'yellow', hex: '#facc15' },
  { color: 'green',  hex: '#4ade80' },
  { color: 'blue',   hex: '#60a5fa' },
  { color: 'pink',   hex: '#f472b6' },
  { color: 'purple', hex: '#a78bfa' },
]

interface HighlightPopupProps {
  position: { top: number; left: number }
  mode: 'new' | 'edit'
  quote?: string
  onColorSelect: (color: HighlightColor) => void
  onCopy?: () => void
  onAskAI?: () => void
  onDelete?: () => void
  onDismiss: () => void
}

export default function HighlightPopup({
  position,
  mode,
  onColorSelect,
  onCopy,
  onAskAI,
  onDelete,
  onDismiss,
}: HighlightPopupProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onDismiss])

  return createPortal(
    <div
      ref={ref}
      className="highlight-popup"
      style={{ top: position.top, left: position.left }}
    >
      {COLORS.map(({ color, hex }) => (
        <button
          key={color}
          className="highlight-color-dot"
          style={{ background: hex }}
          onClick={() => onColorSelect(color)}
          aria-label={`Highlight ${color}`}
        />
      ))}
      {mode === 'new' && onCopy && (
        <>
          <div className="highlight-popup-divider" />
          <button
            className="popup-copy-btn"
            onClick={onCopy}
            aria-label="Copy text"
            title="Copy"
          >
            ⎘
          </button>
        </>
      )}
      {mode === 'new' && onAskAI && (
        <>
          <div className="highlight-popup-divider" />
          <button
            className="popup-ask-ai-btn"
            onClick={onAskAI}
            aria-label="Ask AI about selection"
            title="Ask AI"
          >
            Ask AI
          </button>
        </>
      )}
      {mode === 'edit' && onDelete && (
        <>
          <div className="highlight-popup-divider" />
          <button
            className="highlight-delete-btn"
            onClick={onDelete}
            aria-label="Remove highlight"
          >
            ✕
          </button>
        </>
      )}
    </div>,
    document.body,
  )
}
