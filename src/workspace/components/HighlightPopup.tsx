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
  mode: 'new' | 'edit'
  quote?: string
  initialComment?: string
  defaultColor?: HighlightColor
  onColorSelect: (color: HighlightColor, comment: string) => void
  onCopy?: () => void
  onAskAI?: () => void
  onDelete?: () => void
  onSaveComment?: (comment: string) => void
  onDismiss: () => void
}

export default function HighlightPopup({
  position,
  mode,
  quote,
  defaultColor,
  onColorSelect,
  onCopy,
  onAskAI,
  onDelete,
  onSaveComment,
  onDismiss,
  initialComment = '',
}: HighlightPopupProps) {
  const [comment, setComment] = useState(initialComment)
  const commentRef = useRef(comment)
  useEffect(() => { commentRef.current = comment }, [comment])

  // Show textarea open if there's already a comment, collapsed otherwise
  const [commentOpen, setCommentOpen] = useState(initialComment.trim().length > 0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (commentOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [commentOpen])

  const quotePreview = quote
    ? (quote.length > 54 ? quote.slice(0, 54).trimEnd() + '…' : quote)
    : null

  const hasComment = comment.trim().length > 0

  return createPortal(
    <>
      <div className="highlight-popup-backdrop" onMouseDown={onDismiss} />

      <div
        className="highlight-popup"
        style={{ top: position.top, left: position.left }}
      >
        {/* Selected text preview (new mode only) */}
        {mode === 'new' && quotePreview && (
          <div className="popup-quote-preview">"{quotePreview}"</div>
        )}

        {/* Color dots + action icons */}
        <div className="highlight-popup-row">
          {COLORS.map(({ color, hex }) => (
            <button
              key={color}
              className={`highlight-color-dot${mode === 'new' && defaultColor === color ? ' default' : ''}`}
              style={{ background: hex }}
              onClick={() => onColorSelect(color, commentRef.current)}
              aria-label={`Highlight ${color}`}
            />
          ))}

          <span className="highlight-popup-spacer" />

          {mode === 'new' && onCopy && (
            <button className="popup-icon-btn" onClick={onCopy} title="Copy">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="0.5" y="3.5" width="9" height="9" rx="1"/>
                <path d="M3.5 3.5V2a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H10"/>
              </svg>
            </button>
          )}
          {mode === 'new' && onAskAI && (
            <button className="popup-icon-btn" onClick={onAskAI} title="Ask AI">AI</button>
          )}
          {mode === 'edit' && onDelete && (
            <button className="popup-icon-btn popup-icon-btn--delete" onClick={onDelete} title="Delete highlight">✕</button>
          )}
        </div>

        <div className="highlight-popup-sep" />

        {/* Note section */}
        {commentOpen ? (
          <>
            <textarea
              ref={textareaRef}
              className="highlight-comment-input"
              placeholder="Add a note…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            {hasComment && (
              <div className="highlight-popup-actions">
                <button className="popup-action-btn" onClick={() => setComment('')}>
                  Clear
                </button>
                {mode === 'new' && (
                  <button
                    className="popup-action-btn popup-action-btn--save"
                    onClick={() => onColorSelect(defaultColor ?? 'yellow', commentRef.current)}
                  >
                    Save
                  </button>
                )}
                {mode === 'edit' && onSaveComment && (
                  <button
                    className="popup-action-btn popup-action-btn--save"
                    onClick={() => { onSaveComment(commentRef.current); onDismiss() }}
                  >
                    Save
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <button className="popup-add-note-btn" onClick={() => setCommentOpen(true)}>
            + Add note
          </button>
        )}
      </div>
    </>,
    document.body,
  )
}
