import { useEffect, useRef, useState } from 'react'
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
  currentColor: HighlightColor
  note?: string
  onColorChange: (color: HighlightColor) => void
  onNoteSave: (note: string) => void
  onDelete: () => void
  onDismiss: () => void
}

export default function HighlightPopup({
  position, currentColor, note,
  onColorChange, onNoteSave, onDelete, onDismiss,
}: HighlightPopupProps) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteValue, setNoteValue] = useState(note ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (noteOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [noteOpen])

  const notePreview = note && note.length > 60
    ? note.slice(0, 60).trimEnd() + '…'
    : note

  return createPortal(
    <>
      <div className="highlight-popup-backdrop" onMouseDown={onDismiss} />
      <div className="highlight-popup" style={{ top: position.top, left: position.left }}>

        {/* Color row */}
        <div className="popup-color-row">
          {COLORS.map(({ color, hex }) => (
            <button
              key={color}
              className={`pp-dot${color === currentColor ? ' pp-dot--active' : ''}`}
              style={{ background: hex }}
              onClick={() => onColorChange(color)}
              aria-label={`Change to ${color}`}
            />
          ))}
          <div className="popup-spacer" />
          <button className="popup-clear-btn" onClick={onDelete}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
            Clear
          </button>
        </div>

        <div className="popup-divider" />

        {/* Note section */}
        {noteOpen ? (
          <>
            <textarea
              ref={textareaRef}
              className="popup-note-textarea"
              placeholder="Add a note…"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              rows={2}
            />
            <div className="popup-note-actions">
              <button
                className="popup-note-btn"
                onClick={() => { setNoteOpen(false); setNoteValue(note ?? '') }}
              >
                Cancel
              </button>
              <button
                className="popup-note-btn popup-note-btn--save"
                onClick={() => onNoteSave(noteValue)}
              >
                Save
              </button>
            </div>
          </>
        ) : note ? (
          <div className="popup-note-text" onClick={() => setNoteOpen(true)}>
            {notePreview}
            <span className="popup-note-badge">tap to edit</span>
          </div>
        ) : (
          <button className="popup-note-add" onClick={() => setNoteOpen(true)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add note
          </button>
        )}
      </div>
    </>,
    document.body,
  )
}
