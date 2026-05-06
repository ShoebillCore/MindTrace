# Chat Panel Polish

**Date:** 2026-05-06
**Status:** Approved

---

## Problem

The chat panel blends into the rest of the workspace — same flat background, too many separator lines, cluttered header with icons that duplicate the main app header (download, settings). The panel has no visual presence of its own.

---

## Design

### Panel Background & Shape

- **Background:** `#f4f6fb` (cool slate) — distinct from the article panel's warm cream
- **Dark mode override:** `[data-theme='dark'] .chat-panel` → `background: #1a1d26`
- **Border radius:** `border-radius: 12px` on `.chat-panel`
- **Border:** replace the existing `border-left` with a full `border: 1px solid rgba(0, 0, 60, 0.1)`
- **Shadow:** `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.10)`
- **Overflow:** `overflow: hidden` to clip child elements to the rounded corners

### Header — Single Row

Replace the current two-row header (toolbar row + status row) with a single compact row:

**Left side:** green status dot + provider name + model badge  
**Right side:** ✕ close button only — no download icon, no settings icon

Remove `onDownload` and `onSettingsOpen` props from `ChatHeader`. Keep `onSettingsOpen` in `ChatPanel` (still used by the "no API key" prompt button).

New CSS class `.chat-header` becomes a single flex row:
```css
padding: 11px 14px;
display: flex;
align-items: center;
justify-content: space-between;
background: transparent; /* inherits panel bg */
border-bottom: none;
```

Remove `.chat-header-toolbar` and `.chat-header-status` classes (no longer needed).

### Quick Actions

Remove the heavy `border-bottom` on `.quick-actions`. Replace with a single faint hairline `rgba(0, 0, 60, 0.08)` to separate it from the message list.

### Input Box

Change `.chat-input-container` background from `var(--bg-primary)` to `#ffffff` so it lifts off the slate panel background.

---

## Files to Change

| File | Change |
|------|--------|
| `src/workspace/styles.css` | Restyle `.chat-panel`, `.chat-header`, `.quick-actions`, `.chat-input-container`; remove `.chat-header-toolbar`, `.chat-header-status` |
| `src/workspace/components/ChatHeader.tsx` | Merge into single row, remove download + settings buttons and their props |
| `src/workspace/components/ChatPanel.tsx` | Remove `onDownload` from interface and `headerProps`; keep `onSettingsOpen` |
| `src/workspace/App.tsx` | Remove `onDownload` from `<ChatPanel>` props |

---

## Verification

1. `npm run build` — zero TypeScript errors
2. Chat panel has cool slate background, rounded corners, visible shadow
3. Header is a single row: dot + provider + model on left, ✕ on right — no download/settings icons
4. Quick actions have a faint hairline separator below, not a heavy border
5. Input box is white, lifting off the slate background
6. Dark mode: panel uses dark cool background (`#1a1d26`)
7. "No API key" prompt still shows an "Open Settings" button (ChatPanel-level, not header-level)
