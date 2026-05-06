# Highlight Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current highlight popup with a two-component system: a dark flash pill that auto-closes after 2 s when a new highlight is created, and a persistent light card popup for editing existing highlights.

**Architecture:** `HighlightFlashPill` owns its own timer and handles color change for brand-new highlights. `HighlightPopup` is a stateful persistent card that lets users change color, add/edit notes, or delete. `ArticlePanel` holds two independent state slices (`flashPill`, `editPopup`) and wires both components.

**Tech Stack:** React 18, TypeScript, CSS custom properties (`--bg-primary`, `--border`, `--text-primary`, etc.), `createPortal` for both overlay components, `chrome.storage.local` via `useHighlights` hook.

---

## Task 1 — Update `useHighlights` so `addHighlight` returns the new id

**Files:**
- Modify: `src/workspace/hooks/useHighlights.ts`

`ArticlePanel` needs the id of the highlight it just created in order to wire the flash pill to it.

- [ ] **Step 1: Open the file and locate `addHighlight`**

The function currently looks like this (around line 32):

```typescript
const addHighlight = (quote: string, color: HighlightColor, comment?: string) => {
  const h: Highlight = { id: Date.now().toString(), url, quote, color, ...(comment ? { comment } : {}) }
  persist([...highlights, h])
}
```

- [ ] **Step 2: Add a return type and return the id**

Replace the function with:

```typescript
const addHighlight = (quote: string, color: HighlightColor, comment?: string): string => {
  const id = Date.now().toString()
  const h: Highlight = { id, url, quote, color, ...(comment ? { comment } : {}) }
  persist([...highlights, h])
  return id
}
```

No other changes to the file. The return object `{ highlights, addHighlight, updateHighlight, removeHighlight }` stays the same — TypeScript infers the new return type automatically.

- [ ] **Step 3: Build to confirm no TypeScript errors**

```bash
cd /Users/chengjing/Desktop/Github/MindTrace && npm run build 2>&1 | tail -10
```

Expected: `✓ All steps completed.` with no error lines.

- [ ] **Step 4: Commit**

```bash
git add src/workspace/hooks/useHighlights.ts
git commit -m "feat: addHighlight returns the new highlight id"
```

---

## Task 2 — Create `HighlightFlashPill`

**Files:**
- Create: `src/workspace/components/HighlightFlashPill.tsx`

This component renders a dark pill with 5 color dots above a freshly created highlight. It auto-dismisses after 2 s; hovering pauses the timer.

- [ ] **Step 1: Create the file with this exact content**

```tsx
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

interface HighlightFlashPillProps {
  position: { top: number; left: number }
  currentColor: HighlightColor
  onColorChange: (color: HighlightColor) => void
  onDismiss: () => void
}

export default function HighlightFlashPill({
  position, currentColor, onColorChange, onDismiss,
}: HighlightFlashPillProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
  }

  const startTimer = () => {
    clearTimer()
    timerRef.current = setTimeout(onDismiss, 2000)
  }

  useEffect(() => {
    startTimer()
    return clearTimer
  }, [])

  return createPortal(
    <div
      className="hl-flash-pill"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
    >
      {COLORS.map(({ color, hex }) => (
        <button
          key={color}
          className={`fp-dot${color === currentColor ? ' fp-dot--active' : ''}`}
          style={{ background: hex }}
          onClick={() => { onColorChange(color); onDismiss() }}
          aria-label={`Change to ${color}`}
        />
      ))}
    </div>,
    document.body,
  )
}
```

- [ ] **Step 2: Build to confirm no TypeScript errors**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ All steps completed.` (The component isn't used yet, that's fine.)

- [ ] **Step 3: Commit**

```bash
git add src/workspace/components/HighlightFlashPill.tsx
git commit -m "feat: add HighlightFlashPill component"
```

---

## Task 3 — Rewrite `HighlightPopup`

**Files:**
- Rewrite: `src/workspace/components/HighlightPopup.tsx`

The new popup is a light card with a color row + divider + note section. It has no mode switching — the note section expands/collapses with local state.

- [ ] **Step 1: Replace the entire file with this content**

```tsx
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
```

- [ ] **Step 2: Build to confirm no TypeScript errors**

```bash
npm run build 2>&1 | tail -10
```

Expected: errors about `ArticlePanel` using old props (`mode`, `onColorSelect`, etc.) — that's fine; we fix it in Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/workspace/components/HighlightPopup.tsx
git commit -m "feat: rewrite HighlightPopup as persistent light-card popup"
```

---

## Task 4 — Update `ArticlePanel`

**Files:**
- Rewrite: `src/workspace/components/ArticlePanel.tsx`

This is the main wiring task. New state slices, new helpers, updated handlers, updated JSX.

- [ ] **Step 1: Replace the entire file with this content**

```tsx
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
```

- [ ] **Step 2: Build — expect clean output**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ All steps completed.` with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/workspace/components/ArticlePanel.tsx
git commit -m "feat: wire HighlightFlashPill and redesigned HighlightPopup in ArticlePanel"
```

---

## Task 5 — Replace popup CSS, add flash pill CSS

**Files:**
- Modify: `src/workspace/styles.css`

Replace the entire old popup CSS block (from `/* ── Highlight popup */` to `.highlight-color-dot.default { }`) with the new unified block, and add the flash pill styles just before it.

- [ ] **Step 1: Find the old block**

In `styles.css`, locate the comment line:
```
/* ── Highlight popup ───────────────────────── */
```
It starts with `.highlight-popup-backdrop` and ends with `.highlight-color-dot.default { ... }` just before the `/* ══ Settings Page */` comment.

- [ ] **Step 2: Replace that entire block**

Delete everything from `/* ── Highlight popup ───────────────────────── */` through the closing `}` of `.highlight-color-dot.default`, and replace it with:

```css
/* ── Flash Pill ───────────────────────── */

.hl-flash-pill {
  position: fixed;
  z-index: 600;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: #1c1c1e;
  border-radius: 20px;
  padding: 5px 10px;
  box-shadow: 0 3px 14px rgba(0,0,0,0.32);
}

.fp-dot {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: transform 0.12s;
}

.fp-dot:hover {
  transform: scale(1.2);
}

.fp-dot--active {
  border-color: rgba(255, 255, 255, 0.9);
}

/* ── Highlight popup ───────────────────────── */

.highlight-popup-backdrop {
  position: fixed;
  inset: 0;
  z-index: 499;
  background: transparent;
}

.highlight-popup {
  position: fixed;
  z-index: 500;
  transform: translateX(-50%);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  width: 248px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
}

.popup-color-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.pp-dot {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  border: 2.5px solid transparent;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: transform 0.12s;
}

.pp-dot:hover {
  transform: scale(1.18);
}

.pp-dot--active {
  border-color: var(--text-primary);
}

.popup-spacer {
  flex: 1;
}

.popup-clear-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
  font-family: inherit;
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 5px;
  transition: background 0.12s;
}

.popup-clear-btn:hover {
  background: rgba(239, 68, 68, 0.08);
}

.popup-divider {
  height: 1px;
  background: var(--border);
  margin: 8px -10px;
}

.popup-note-add {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-family: inherit;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 0;
  transition: color 0.12s;
}

.popup-note-add:hover {
  color: var(--text-secondary);
}

.popup-note-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  padding: 3px 0;
  cursor: pointer;
  transition: color 0.12s;
}

.popup-note-text:hover {
  color: var(--text-primary);
}

.popup-note-badge {
  display: inline-block;
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border-radius: 3px;
  padding: 1px 5px;
  margin-left: 5px;
  vertical-align: middle;
}

.popup-note-textarea {
  width: 100%;
  resize: none;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text-primary);
  font-size: 11.5px;
  font-family: inherit;
  line-height: 1.5;
  padding: 6px 8px;
  outline: none;
  box-sizing: border-box;
  margin-top: 4px;
}

.popup-note-textarea:focus {
  border-color: var(--text-muted);
}

.popup-note-textarea::placeholder {
  color: var(--text-muted);
}

.popup-note-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  margin-top: 7px;
}

.popup-note-btn {
  height: 24px;
  border-radius: 5px;
  font-size: 11px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  padding: 0 11px;
  border: 1px solid var(--border);
  background: none;
  color: var(--text-secondary);
}

.popup-note-btn:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.popup-note-btn--save {
  background: var(--text-primary);
  color: var(--bg-primary);
  border-color: var(--text-primary);
}

.popup-note-btn--save:hover {
  opacity: 0.82;
}
```

- [ ] **Step 3: Build to confirm clean CSS parse and no TS errors**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ All steps completed.`

- [ ] **Step 4: Commit**

```bash
git add src/workspace/styles.css
git commit -m "feat: replace popup CSS with flash pill + persistent popup styles"
```

---

## Task 6 — Build verification

- [ ] **Step 1: Full clean build**

```bash
npm run build 2>&1
```

Expected output ends with:
```
✓ All steps completed.
```

No TypeScript errors, no missing module errors.

- [ ] **Step 2: Manual smoke-test checklist**

Load the extension in Chrome and open a captured article. Verify each item:

1. **Select text** → "Highlight" mini tooltip appears (dark pill, above selection) ✓
2. **Click "Highlight"** → text turns yellow immediately → mini tooltip gone → dark flash pill appears above span with yellow dot active ✓
3. **Wait 2 s without touching pill** → pill fades/disappears ✓
4. **Select text, click Highlight, then hover pill** → countdown pauses, pill stays visible ✓
5. **Select text, click Highlight, click green dot** → highlight turns green, pill disappears immediately ✓
6. **Click an existing highlight** → light card popup appears below span with color row + divider + "Add note" link ✓
7. **In popup, click a different color dot** → highlight color changes, **popup stays open** ✓
8. **Click "Add note"** → textarea appears, focused ✓
9. **Type a note, click Save** → popup closes, note saved ✓
10. **Click same highlight again** → popup shows truncated note text with "tap to edit" badge ✓
11. **Click note text** → textarea opens with existing text ✓
12. **Edit note, click Cancel** → textarea collapses, popup stays open, note unchanged ✓
13. **Click "Clear"** → highlight removed, popup closes ✓
14. **Click backdrop** → popup closes ✓

- [ ] **Step 3: Final commit if any minor tweaks were needed**

```bash
git add -p   # review any remaining changes
git commit -m "fix: highlight redesign smoke-test adjustments"
```
