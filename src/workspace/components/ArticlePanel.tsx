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

  // Refs so the document-level mouseup handler always reads the latest state
  // without needing to be re-registered on every render.
  const flashPillRef = useRef<FlashPillState | null>(null)
  const editPopupRef = useRef<EditPopupState | null>(null)
  useEffect(() => { flashPillRef.current = flashPill }, [flashPill])
  useEffect(() => { editPopupRef.current = editPopup }, [editPopup])

  // Document-level mouseup handler so tooltip fires even when the mouse is
  // released outside the article-body div (e.g. on the title, scroll area,
  // or after dragging past the edge of the panel).
  useEffect(() => {
    const onMouseUp = () => {
      if (flashPillRef.current || editPopupRef.current) return
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) return
      const body = articleBodyRef.current
      if (!body) return
      const range = sel.getRangeAt(0)
      // Only act when at least one endpoint of the selection is inside the article body
      if (!body.contains(range.startContainer) && !body.contains(range.endContainer)) return
      const rect = range.getBoundingClientRect()
      // Normalize whitespace so cross-block selections (which carry \n between paragraphs)
      // still produce a clean quote that matches the flat text we search later.
      const quote = sel.toString().replace(/\s+/g, ' ').trim()
      if (!quote) return
      setSelectionTooltip({
        tooltipPos: tooltipPosition(rect),
        flashPillPos: flashPillPosition(rect),
        quote,
      })
    }
    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [articleBodyRef]) // articleBodyRef is stable — registers once

  // Apply highlight spans to the DOM
  useLayoutEffect(() => {
    const body = articleBodyRef.current
    if (!body) return

    // Remove all existing highlight spans
    body.querySelectorAll('[data-highlight-id]').forEach((span) => {
      const parent = span.parentNode!
      while (span.firstChild) parent.insertBefore(span.firstChild, span)
      parent.removeChild(span)
    })
    // Merge text nodes that were split by previous span insertions so subsequent
    // indexOf/regex searches work against a consistent flat string.
    body.normalize()

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

      // Use flexible whitespace matching (\s*) so that a quote saved with a
      // space between paragraphs still matches flat text that has no whitespace
      // at that boundary (when the HTML has no text node between block elements).
      const escapedQuote = hl.quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(escapedQuote.replace(/\s+/g, '\\s*'))
      const match = pattern.exec(flat)
      if (!match) continue

      const idx = match.index
      const end = idx + match[0].length

      let startNodeIdx = -1, startOff = 0
      for (let i = textNodes.length - 1; i >= 0; i--) {
        if (offsets[i] <= idx) { startNodeIdx = i; startOff = idx - offsets[i]; break }
      }
      if (startNodeIdx === -1) continue

      let endNodeIdx = -1, endOff = 0
      for (let i = textNodes.length - 1; i >= 0; i--) {
        if (offsets[i] < end) { endNodeIdx = i; endOff = end - offsets[i]; break }
      }
      if (endNodeIdx === -1) continue

      // Apply one span per text-node segment within the range.
      // surroundContents on a single text node always succeeds — no element
      // boundary is ever partially crossed, so cross-inline-element selections
      // (e.g. spanning <em> or <strong>) are handled correctly.
      for (let ni = startNodeIdx; ni <= endNodeIdx; ni++) {
        const node = textNodes[ni]
        const segStart = ni === startNodeIdx ? startOff : 0
        const segEnd = ni === endNodeIdx ? endOff : (node.nodeValue?.length ?? 0)
        if (segStart >= segEnd) continue
        try {
          const segRange = document.createRange()
          segRange.setStart(node, segStart)
          segRange.setEnd(node, segEnd)
          const span = document.createElement('span')
          span.className = `hl-${hl.color}`
          span.dataset.highlightId = hl.id
          segRange.surroundContents(span)
        } catch {
          // skip this segment
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
