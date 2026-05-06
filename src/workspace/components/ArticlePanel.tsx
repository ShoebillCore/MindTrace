// src/workspace/components/ArticlePanel.tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CapturedPage } from '../providers/types'
import { useHighlights } from '../hooks/useHighlights'
import type { HighlightColor } from '../hooks/useHighlights'
import HighlightFlashPill from './HighlightFlashPill'
import HighlightPopup from './HighlightPopup'

interface ArticlePanelProps {
  page: CapturedPage | null
  onAskAI?: (text: string) => void
  articleBodyRef: React.RefObject<HTMLDivElement | null>
  defaultHighlightColor?: HighlightColor
}

interface FlashPillState {
  position: { top: number; left: number }
  highlightId: string
  color: HighlightColor
}

interface EditPopupState {
  position: { top: number; left: number }
  highlightId: string
}

interface SelectionTooltipState {
  tooltipPos: { top: number; left: number }
  flashPillPos: { top: number; left: number }
  quote: string
}

interface TimelineMarker {
  id: string
  color: string
  top: number
  preview: string
  comment?: string
}

const HL_COLORS: Record<HighlightColor, string> = {
  yellow: '#facc15',
  green:  '#4ade80',
  blue:   '#60a5fa',
  pink:   '#f472b4',
  purple: '#a78bfa',
}

const CLAMP_W = 200

function clampedCenter(rect: DOMRect): number {
  const raw = rect.left + rect.width / 2
  return Math.max(CLAMP_W / 2 + 8, Math.min(window.innerWidth - CLAMP_W / 2 - 8, raw))
}

function tooltipPosition(rect: DOMRect): { top: number; left: number } {
  const left = Math.max(60, Math.min(window.innerWidth - 60, rect.left + rect.width / 2))
  return { top: rect.bottom + 8, left }
}

function flashPillPosition(rect: DOMRect): { top: number; left: number } {
  return { top: rect.top - 8, left: clampedCenter(rect) }
}

function editPopupPosition(rect: DOMRect): { top: number; left: number } {
  return { top: rect.bottom + 8, left: clampedCenter(rect) }
}

export default function ArticlePanel({ page, onAskAI, articleBodyRef, defaultHighlightColor }: ArticlePanelProps) {
  const { highlights, addHighlight, updateHighlight, removeHighlight } = useHighlights(
    page?.url ?? '',
  )
  const [flashPill, setFlashPill] = useState<FlashPillState | null>(null)
  const [editPopup, setEditPopup] = useState<EditPopupState | null>(null)
  const [selectionTooltip, setSelectionTooltip] = useState<SelectionTooltipState | null>(null)
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
      const textNodes: Text[] = []
      const offsets: number[] = []
      let flat = ''
      const tw = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
      let tn: Text | null
      while ((tn = tw.nextNode() as Text | null)) {
        offsets.push(flat.length)
        flat += tn.nodeValue ?? ''
        textNodes.push(tn)
      }

      const idx = flat.indexOf(hl.quote)
      if (idx === -1) continue

      const end = idx + hl.quote.length

      let startNode!: Text, startOff = 0
      for (let i = textNodes.length - 1; i >= 0; i--) {
        if (offsets[i] <= idx) { startNode = textNodes[i]; startOff = idx - offsets[i]; break }
      }

      let endNode!: Text, endOff = 0
      for (let i = textNodes.length - 1; i >= 0; i--) {
        if (offsets[i] < end) { endNode = textNodes[i]; endOff = end - offsets[i]; break }
      }

      if (!startNode || !endNode) continue

      try {
        const range = document.createRange()
        range.setStart(startNode, startOff)
        range.setEnd(endNode, endOff)
        const span = document.createElement('span')
        span.className = `hl-${hl.color}`
        span.dataset.highlightId = hl.id
        range.surroundContents(span)
      } catch {
        if (startNode === endNode) {
          const matchNode = startNode.splitText(startOff)
          matchNode.splitText(hl.quote.length)
          const span = document.createElement('span')
          span.className = `hl-${hl.color}`
          span.dataset.highlightId = hl.id
          matchNode.parentNode!.insertBefore(span, matchNode)
          span.appendChild(matchNode)
        }
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
      markers.push({ id: hl.id, color: HL_COLORS[hl.color], top: fraction, preview, comment: hl.comment })
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
    if (flashPill || editPopup) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setSelectionTooltip({
      tooltipPos: tooltipPosition(rect),
      flashPillPos: flashPillPosition(rect),
      quote: sel.toString().trim(),
    })
  }

  const handleTooltipClick = () => {
    if (!selectionTooltip) return
    const color = defaultHighlightColor ?? 'yellow'
    const id = addHighlight(selectionTooltip.quote, color)
    setFlashPill({ highlightId: id, position: selectionTooltip.flashPillPos, color })
    setSelectionTooltip(null)
    window.getSelection()?.removeAllRanges()
  }

  const handleBodyClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-highlight-id]') as HTMLElement | null
    if (!target) return
    setSelectionTooltip(null)
    const id = target.dataset.highlightId!
    const rect = target.getBoundingClientRect()
    setEditPopup({ highlightId: id, position: editPopupPosition(rect) })
  }

  const handleColorFlash = (color: HighlightColor) => {
    if (flashPill?.highlightId) updateHighlight(flashPill.highlightId, { color })
    setFlashPill(null)
  }

  const handleColorEdit = (color: HighlightColor) => {
    if (editPopup?.highlightId) updateHighlight(editPopup.highlightId, { color })
    // popup stays open — no setEditPopup(null)
  }

  const handleNoteSave = (text: string) => {
    if (editPopup?.highlightId) updateHighlight(editPopup.highlightId, { comment: text || undefined })
    setEditPopup(null)
  }

  const handleDelete = () => {
    if (editPopup?.highlightId) removeHighlight(editPopup.highlightId)
    setEditPopup(null)
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

        {selectionTooltip && !flashPill && !editPopup && (
          <>
            <div
              className="selection-tooltip-backdrop"
              onMouseDown={() => setSelectionTooltip(null)}
            />
            <div
              className="selection-tooltip"
              style={{ top: selectionTooltip.tooltipPos.top, left: selectionTooltip.tooltipPos.left }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); handleTooltipClick() }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Highlight
            </div>
          </>
        )}

        {flashPill && (
          <HighlightFlashPill
            position={flashPill.position}
            currentColor={flashPill.color}
            onColorChange={handleColorFlash}
            onDismiss={() => setFlashPill(null)}
          />
        )}

        {editPopup && (
          <HighlightPopup
            position={editPopup.position}
            currentColor={highlights.find((h) => h.id === editPopup.highlightId)?.color ?? 'yellow'}
            note={highlights.find((h) => h.id === editPopup.highlightId)?.comment}
            onColorChange={handleColorEdit}
            onNoteSave={handleNoteSave}
            onDelete={handleDelete}
            onDismiss={() => setEditPopup(null)}
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
              <span className="timeline-tooltip">
                <span className="tooltip-quote">{m.preview}</span>
                {m.comment && (
                  <span className="tooltip-comment">
                    {m.comment.length > 40 ? m.comment.slice(0, 40).trimEnd() + '…' : m.comment}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
