# Highlight Redesign — Design Spec

**Date:** 2026-05-06

---

## Goal

Replace the current highlight feature with a cleaner two-component system that separates the "just created" flash affordance from the persistent edit popup, producing a more intuitive and visually polished highlight experience.

---

## Interaction Flow

### Creating a new highlight

1. User selects text → `mouseup` fires on article body.
2. A "Highlight" mini tooltip (dark pill, centered above the selection) appears.
3. User clicks "Highlight":
   - Default color is applied to the selection immediately.
   - Mini tooltip disappears.
   - `HighlightFlashPill` appears floating above the newly created highlight span.
4. Flash pill displays 5 color dots; the default color has a white active ring.
5. Flash pill auto-closes after **2 seconds** if untouched.
   - `onMouseEnter` → clears the timer.
   - `onMouseLeave` → restarts a fresh 2 s timer.
6. User clicks a color dot → highlight color updates immediately, flash pill closes.
7. User clicks anywhere outside → flash pill closes immediately.

### Editing an existing highlight

1. User clicks highlighted text → `HighlightPopup` appears below the span.
2. Popup top row: 5 color dots (active color has a dark ring) + "🗑 Clear" button on the right.
3. Thin divider.
4. Note section (below divider):
   - **No note:** shows "+ Add note" link with a plus icon.
   - **Note exists:** shows truncated note text + a "tap to edit" badge.
5. Clicking note text or "+ Add note" → expands textarea in-place; Save / Cancel buttons appear.
6. Clicking a color dot → changes color immediately, **popup stays open**.
7. Clicking "Clear" → deletes the highlight, closes popup.
8. Clicking Save → saves note, closes popup.
9. Clicking Cancel → discards note edits, **collapses the note editor** (popup stays open; color changes already persisted).
10. Clicking the backdrop → closes popup.

---

## Components

### `HighlightFlashPill` — new file

**File:** `src/workspace/components/HighlightFlashPill.tsx`

**Purpose:** Short-lived color-change affordance after a highlight is created. Owns its own auto-close timer.

**Props:**
```typescript
interface HighlightFlashPillProps {
  position: { top: number; left: number }  // viewport coords, centered above span
  currentColor: HighlightColor
  onColorChange: (color: HighlightColor) => void
  onDismiss: () => void
}
```

**Behavior:**
- Renders via `createPortal` to `document.body`.
- No full-screen backdrop (pill auto-closes anyway).
- On mount: `setTimeout(onDismiss, 2000)`.
- `onMouseEnter`: `clearTimeout`.
- `onMouseLeave`: restart 2 s `setTimeout`.
- Color dot click: `onColorChange(color)` then `onDismiss()`.
- CSS class: `.hl-flash-pill` — dark background (`#1c1c1e`), 20 px border-radius, `position: fixed`, `transform: translateX(-50%)`.

### `HighlightPopup` — rewrite

**File:** `src/workspace/components/HighlightPopup.tsx`

**Purpose:** Persistent popup for editing an existing highlight's color and note.

**Props:**
```typescript
interface HighlightPopupProps {
  position: { top: number; left: number }  // viewport coords, below span
  currentColor: HighlightColor
  note?: string
  onColorChange: (color: HighlightColor) => void
  onNoteSave: (note: string) => void
  onDelete: () => void
  onDismiss: () => void
}
```

**Behavior:**
- Renders via `createPortal` to `document.body`.
- Full-screen transparent backdrop: `onMouseDown → onDismiss`.
- Local state: `noteOpen: boolean`, `noteValue: string` (initialized from `note` prop).
- Color dot click → `onColorChange(color)` (popup stays open).
- "+ Add note" or note text click → `setNoteOpen(true)`, textarea auto-focuses.
- Save → `onNoteSave(noteValue)` (parent closes popup).
- Cancel → `setNoteOpen(false)`, `setNoteValue(note ?? '')`.
- "Clear" → `onDelete()` (parent closes popup).
- CSS class: `.highlight-popup` — light card, white background, `border: 1px solid #e4e4e7`, `border-radius: 10px`, `width: 248px`, `box-shadow`.

---

## State in `ArticlePanel`

Two independent state slices replace the old single `popup` state:

```typescript
interface FlashPillState {
  position: { top: number; left: number }
  highlightId: string
  color: HighlightColor
}

interface EditPopupState {
  position: { top: number; left: number }
  highlightId: string
}

// In component:
const [flashPill, setFlashPill] = useState<FlashPillState | null>(null)
const [editPopup, setEditPopup] = useState<EditPopupState | null>(null)
```

### Handler mapping

| Event | Handler | Side effects |
|---|---|---|
| Tooltip click | `handleTooltipClick` | `addHighlight(quote, defaultColor)` → `setFlashPill({ id, position, color: defaultColor })` |
| Flash pill color click | `handleColorFlash(color)` | `updateHighlight(flashPill.id, { color })` → `setFlashPill(null)` |
| Flash pill dismiss | `handleFlashDismiss` | `setFlashPill(null)` |
| Existing highlight click | `handleBodyClick` | `setEditPopup({ id, position })` |
| Popup color click | `handleColorEdit(color)` | `updateHighlight(editPopup.id, { color })` — popup stays open |
| Popup note save | `handleNoteSave(text)` | `updateHighlight(editPopup.id, { comment: text \|\| undefined })` → `setEditPopup(null)` |
| Popup delete | `handleDelete` | `removeHighlight(editPopup.id)` → `setEditPopup(null)` |
| Popup dismiss | `handleEditDismiss` | `setEditPopup(null)` |

### Flash pill positioning

`SelectionTooltipState` stores **two** pre-calculated positions captured at `mouseup` time:

```typescript
interface SelectionTooltipState {
  tooltipPos:   { top: number; left: number }  // mini tooltip: rect.bottom + 8
  flashPillPos: { top: number; left: number }  // flash pill:   rect.top - 8
  quote: string
}
```

Two helper functions in `ArticlePanel`:
- `tooltipPosition(rect)` — `{ top: rect.bottom + 8, left: clampedCenter }` (below, existing)
- `flashPillPosition(rect)` — `{ top: rect.top - 8, left: clampedCenter }` (above, new)

`handleTooltipClick` uses `selectionTooltip.flashPillPos` to set the flash pill position. After `addHighlight` runs, `useLayoutEffect` inserts the span; the selection rect and span rect are close enough for accurate positioning.

### `addHighlight` returns the new id

`useHighlights.addHighlight` is updated to **return the generated `string` id**, so `handleTooltipClick` can wire the flash pill to the correct highlight:

```typescript
// useHighlights.ts
const addHighlight = (quote: string, color: HighlightColor, comment?: string): string => {
  const id = Date.now().toString()
  const h: Highlight = { id, url, quote, color, ...(comment ? { comment } : {}) }
  persist([...highlights, h])
  return id
}
```

```typescript
// ArticlePanel.tsx handleTooltipClick
const id = addHighlight(selectionTooltip.quote, defaultHighlightColor ?? 'yellow')
setFlashPill({ highlightId: id, position: selectionTooltip.flashPillPos, color: defaultHighlightColor ?? 'yellow' })
setSelectionTooltip(null)
window.getSelection()?.removeAllRanges()
```

---

## CSS

### `.hl-flash-pill`
```css
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
```

### `.hl-flash-pill .fp-dot`
```css
width: 15px; height: 15px;
border-radius: 50%;
border: 2px solid transparent;
cursor: pointer;
transition: transform 0.12s;
```
Active: `border-color: rgba(255,255,255,0.9)`. Hover: `transform: scale(1.2)`.

### `.highlight-popup` (revised)
```css
position: fixed;
z-index: 500;
transform: translateX(-50%);
background: #fff;  /* uses var(--bg-primary) for theme compatibility */
border: 1px solid var(--border);
border-radius: 10px;
padding: 10px;
width: 248px;
box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
```

### `.pp-dot` (popup color dots)
```css
width: 17px; height: 17px;
border-radius: 50%;
border: 2.5px solid transparent;
cursor: pointer;
transition: transform 0.12s;
```
Active: `border-color: var(--text-primary)`. Hover: `transform: scale(1.18)`.

### `.popup-clear-btn`
Red text (`#ef4444`), no border, hover gets a faint red background.

### `.popup-note-add`
Small, muted, `+` icon prefix.

### `.popup-note-text`
12 px, `color: var(--text-secondary)`, cursor pointer. "tap to edit" badge: `background: var(--bg-hover)`, small border-radius.

### `.popup-note-textarea`
Full width, 2 rows, `background: var(--bg-secondary)`, `border: 1px solid var(--border)`.

---

## Files Changed

| File | Action |
|---|---|
| `src/workspace/components/HighlightFlashPill.tsx` | **Create** |
| `src/workspace/components/HighlightPopup.tsx` | **Rewrite** |
| `src/workspace/components/ArticlePanel.tsx` | **Modify** — state, handlers, JSX |
| `src/workspace/hooks/useHighlights.ts` | **Modify** — `addHighlight` returns the new id |
| `src/workspace/styles.css` | **Modify** — add flash pill styles, revise popup styles |

`App.tsx` is unchanged.

---

## Out of Scope

- Duplicate highlight detection
- Highlight persistence across devices
- "Ask AI" / copy buttons (removed from popup; may be added later)
- Dark-mode–specific flash pill color (pill is already dark, works in both modes)
