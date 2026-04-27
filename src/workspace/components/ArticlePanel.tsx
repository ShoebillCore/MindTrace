// src/workspace/components/ArticlePanel.tsx
import { useLayoutEffect, useRef, useState } from 'react'
import type { CapturedPage } from '../providers/types'
import { useHighlights } from '../hooks/useHighlights'
import type { HighlightColor } from '../hooks/useHighlights'
import HighlightPopup from './HighlightPopup'

interface ArticlePanelProps {
  page: CapturedPage | null
}

interface PopupState {
  mode: 'new' | 'edit'
  position: { top: number; left: number }
  quote?: string
  highlightId?: string
}

function popupPosition(rect: DOMRect): { top: number; left: number } {
  return {
    top: rect.top + window.scrollY - 44,
    left: rect.left + window.scrollX + rect.width / 2,
  }
}

export default function ArticlePanel({ page }: ArticlePanelProps) {
  const { highlights, addHighlight, updateHighlight, removeHighlight } = useHighlights(
    page?.url ?? '',
  )
  const [popup, setPopup] = useState<PopupState | null>(null)
  const articleBodyRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const body = articleBodyRef.current
    if (!body) return

    // Remove all existing highlight spans (unwrap)
    body.querySelectorAll('[data-highlight-id]').forEach((span) => {
      const parent = span.parentNode!
      while (span.firstChild) parent.insertBefore(span.firstChild, span)
      parent.removeChild(span)
    })

    // Re-apply each highlight via TreeWalker text search
    for (const hl of highlights) {
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
      let node: Text | null
      while ((node = walker.nextNode() as Text | null)) {
        const val = node.nodeValue ?? ''
        const idx = val.indexOf(hl.quote)
        if (idx === -1) continue

        const matchNode = node.splitText(idx)
        matchNode.splitText(hl.quote.length)

        const span = document.createElement('span')
        span.className = `hl-${hl.color}`
        span.dataset.highlightId = hl.id
        matchNode.parentNode!.insertBefore(span, matchNode)
        span.appendChild(matchNode)
        break
      }
    }
  }, [highlights, page])

  const handleMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setPopup({
      mode: 'new',
      position: popupPosition(rect),
      quote: sel.toString().trim(),
    })
  }

  const handleBodyClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-highlight-id]') as HTMLElement | null
    if (!target) return
    const rect = target.getBoundingClientRect()
    setPopup({
      mode: 'edit',
      position: popupPosition(rect),
      highlightId: target.dataset.highlightId,
    })
  }

  const handleColorSelect = (color: HighlightColor) => {
    if (popup?.mode === 'new' && popup.quote) {
      addHighlight(popup.quote, color)
    } else if (popup?.mode === 'edit' && popup.highlightId) {
      updateHighlight(popup.highlightId, color)
    }
    window.getSelection()?.removeAllRanges()
    setPopup(null)
  }

  const handleDelete = () => {
    if (popup?.highlightId) removeHighlight(popup.highlightId)
    setPopup(null)
  }

  if (!page) {
    return (
      <div className="article-panel">
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No article captured.</p>
      </div>
    )
  }

  return (
    <div className="article-panel">
      <h1 className="article-title">{page.title}</h1>
      {(page.byline || page.siteName) && (
        <p className="article-meta">{[page.byline, page.siteName].filter(Boolean).join(' · ')}</p>
      )}
      <div
        ref={articleBodyRef}
        className="article-body"
        dangerouslySetInnerHTML={{ __html: page.content }}
        onMouseUp={handleMouseUp}
        onClick={handleBodyClick}
      />
      {popup && (
        <HighlightPopup
          position={popup.position}
          mode={popup.mode}
          quote={popup.quote}
          onColorSelect={handleColorSelect}
          onCopy={
            popup.mode === 'new' && popup.quote
              ? () => {
                  navigator.clipboard.writeText(popup.quote!)
                  window.getSelection()?.removeAllRanges()
                  setPopup(null)
                }
              : undefined
          }
          onDelete={popup.mode === 'edit' ? handleDelete : undefined}
          onDismiss={() => setPopup(null)}
        />
      )}
    </div>
  )
}
