# Chat Box Redesign

**Date:** 2026-05-06
**Status:** Approved

---

## Problem

The chat panel's message bubbles lack visual distinction. The AI card background (`--bg-card`) is identical to the panel background (`--bg-secondary`) in the default theme, so responses don't stand out. The quick action buttons were garish solid-colored pills. Overall the chat felt flat and unpolished.

---

## Design

### Message Bubbles

**User messages** — right-aligned dark bubble:
- Background: `var(--text-primary)` (near-black in light, near-white in dark)
- Text: `var(--bg-primary)`
- Border radius: `14px 14px 2px 14px` (rounded, squared bottom-right)
- Shadow: `0 1px 4px rgba(0,0,0,0.18)`
- No border
- Max-width: `80%`

**AI messages** — left-aligned white card:
- Background: `var(--bg-primary)` (lighter than panel `--bg-secondary`)
- Border: `1px solid var(--border)`
- Border radius: `2px 14px 14px 14px` (rounded, squared top-left)
- Shadow: `0 1px 4px rgba(0,0,0,0.07)`
- Max-width: `92%`
- Label (Summary / Deep Insight / Questions) is colored — see label colors below

### Label Colors

These replace the existing `LABEL_COLORS` record in `ChatMessage.tsx`:

| Label | Color |
|-------|-------|
| Summary | `#0060cc` (blue) |
| Deep Insight | `#6d28d9` (purple) |
| Questions | `#15803d` (green) |

Labels are uppercase, 9px, bold, `letter-spacing: 1px`, `margin-bottom: 5px`.

### Quick Action Buttons

P1 style — soft outline pills, no fill:

| Button | Text color | Border |
|--------|-----------|--------|
| Summary | `#0060cc` | `1px solid rgba(0,122,255,0.35)` |
| Deep Insight | `#6d28d9` | `1px solid rgba(124,58,237,0.35)` |
| Questions | `#15803d` | `1px solid rgba(22,163,74,0.35)` |

Common: `border-radius: 10px`, `padding: 3px 10px`, no background, hover adds a very faint background tint matching the border color.

### Chat Input

Slightly refined to match the new crispness:
- Container: white `var(--bg-primary)` background, `border: 1px solid var(--border)`, `border-radius: 8px`
- Focus: border darkens to `var(--text-muted)`

---

## Files to Change

| File | Change |
|------|--------|
| `src/workspace/styles.css` | Update `.chat-message--user`, `.chat-message--assistant`, `.quick-action-btn`, `.chat-input-container` |
| `src/workspace/components/ChatMessage.tsx` | Update `LABEL_COLORS` with new hex values |
| `src/workspace/components/QuickActions.tsx` | Add per-button CSS class (`quick-action-btn--summary`, `--insight`, `--question`) |

---

## Verification

1. Build passes with zero TypeScript errors
2. Open chat panel — AI cards are visually distinct from panel background
3. User bubbles are dark with rounded corners and shadow
4. Quick action pills have subtle colored outlines, not filled
5. Summary response label is blue; Deep Insight is purple; Questions is green
6. Hover on quick action buttons shows faint background tint
7. Dark mode — user bubble is light-on-dark, AI card is slightly elevated dark card
