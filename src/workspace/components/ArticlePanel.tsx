// src/workspace/components/ArticlePanel.tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CapturedPage } from '../providers/types'
import { useHighlights } from '../hooks/useHighlights'
import type { HighlightColor } from '../hooks/useHighlights'
import HighlightPopup from './HighlightPopup'

interface ArticlePanelProps {
  page: CapturedPage | null
  onAskAI?: (text: string) => void
  articleBodyRef: React.RefObject<HTMLDivElement | null>
}

interface PopupState {
  mode: 'new' | 'edit'
  position: { top: number; left: number }
  quote?: string
  highlightId?: string
}

interface TimelineMarker {
  id: string
  color: string
  top: number     // 0–1 fraction of scroll height
  preview: string // truncated quote for tooltip
}

const HL_COLORS: Record<HighlightColor, string> = {
  yellow: '#facc15',
  green:  '#4ade80',
  blue:   '#60a5fa',
  pink:   '#f472b4',
  purple: '#a78bfa',
}

function popupPosition(rect: DOMRect): { top: number; left: number } {
  return {
    top: rect.top + window.scrollY - 44,
    left: rect.left + window.scrollX + rect.width / 2,
  }
}

export default function ArticlePanel({ page, onAskAI, articleBodyRef }: ArticlePanelProps) {
  const { highlights, addHighlight, updateHighlight, removeHighlight } = useHighlights(
    page?.url ?? '',
  )
  const [popup, setPopup] = useState<PopupState | null>(null)
  const [timelineMarkers, setTimelineMarkers] = useState<TimelineMarker[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Apply highlight spans to the DOM
  useLayoutEffect(() => {
    const body = articleBodyRef.current
    if (!body) return

    body.querySelectorAll('[data-highlight-id]').forEach((span) => {
      const parent = span.parentNode!
      while (span.firstChild) parent.insertBefore(span.firstChild, span)
      parent.removeChild(span)
    })

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

  // Measure highlight positions after spans are in DOM
  useEffect(() => {
    const area = scrollAreaRef.current
    if (!area || highlights.length === 0) {
      setTimelineMarkers([])
      return
    }
    const areaRect = area.getBoundingClientRect()
    const markers: TimelineMarker[] = []
    for (const hl of highlights) {
      const el = area.querySelector(`[data-highlight-id="${hl.id}"]`) as HTMLElement | null
      if (!el) continue
      const elRect = el.getBoundingClientRect()
      const absoluteTop = elRect.top - areaRect.top + area.scrollTop
      const fraction = Math.max(0.01, Math.min(0.99, absoluteTop / area.scrollHeight))
      const preview = hl.quote.length > 46
        ? hl.quote.slice(0, 46).trimEnd() + '…'
        : hl.quote
      markers.push({ id: hl.id, color: HL_COLORS[hl.color], top: fraction, preview })
    }
    setTimelineMarkers(markers)
  }, [highlights, page])

  const handleTimelineClick = (id: string) => {
    const area = scrollAreaRef.current
    if (!area) return
    const el = area.querySelector(`[data-highlight-id="${id}"]`) as HTMLElement | null
    if (!el) return
    const elRect = el.getBoundingClientRect()
    const areaRect = area.getBoundingClientRect()
    const target = area.scrollTop + (elRect.top - areaRect.top) - area.clientHeight / 2 + el.clientHeight / 2
    area.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }

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
        <div className="article-scroll-area">
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No article captured.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="article-panel">
      <div className="article-scroll-area" ref={scrollAreaRef}>
        <div className="article-content-wrap">
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
        </div>
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
            onAskAI={
              popup.mode === 'new' && popup.quote && onAskAI
                ? () => {
                    onAskAI(popup.quote!)
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

      {timelineMarkers.length > 0 && (
        <div className="article-timeline" aria-hidden="true">
          <div className="article-timeline-track" />
          {timelineMarkers.map((m) => (
            <button
              key={m.id}
              className="article-timeline-dot"
              style={{ top: `${m.top * 100}%`, background: m.color }}
              onClick={() => handleTimelineClick(m.id)}
              aria-label={`Jump to highlight: ${m.preview}`}
            >
              <span className="timeline-tooltip">{m.preview}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
