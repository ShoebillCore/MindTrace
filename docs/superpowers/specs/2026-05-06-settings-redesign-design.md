# Settings Page Redesign — Design Spec

**Date:** 2026-05-06

---

## Goal

Polish the existing settings modal with the "Refined Classic" direction: larger modal, warmer off-white palette, bigger fonts, more rounded controls, and more generous spacing throughout. No new sections or features — this is a pure visual upgrade.

---

## What Changes

### Modal shell

| Property | Before | After |
|---|---|---|
| `width` | 640 px | 780 px |
| `border-radius` | 8 px | 14 px |
| `box-shadow` | none | `0 20px 60px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)` |

### Header & footer

| Property | Before | After |
|---|---|---|
| Header padding | `11px 18px` | `14px 22px` |
| Title font-size | 12 px | 13 px |
| Footer padding | `10px 18px` | `12px 22px` |

### Sidebar nav

| Property | Before | After |
|---|---|---|
| `width` | 118 px | 150 px |
| Nav item font-size | 11 px | 12.5 px |
| Nav item padding | `7px 12px` | `9px 16px` |
| Active item uses | `border-left: 2px` | `border-left: 3px` |

### Content panel

| Property | Before | After |
|---|---|---|
| Padding | `18px 20px` | `22px 26px` |
| Section title font-size | 12 px | 14 px |
| Section title margin-bottom | 14 px | 18 px |
| Field label margin-bottom | 6 px | 8 px |
| Field label adds | — | `margin-top: 14px` on `.sp-field-label`; override with `margin-top: 0` for `.sp-section-title + .sp-field-label` (the first label directly after the section heading) |
| Note font-size | 10 px | 10.5 px |

### Inputs & selects

| Property | Before | After |
|---|---|---|
| `padding` | `6px 9px` | `8px 11px` |
| `font-size` | 11 px | 12.5 px |
| `border-radius` | 3 px | 7 px |

### Step controls (font size / width ±)

| Property | Before | After |
|---|---|---|
| Button size | 24 × 24 px | 28 × 28 px |
| Button `border-radius` | 3 px | 6 px |
| Button `font-size` | 14 px | 16 px |
| Value `font-size` | 11 px | 13 px |
| Row label | uses `.sp-field-label` (9 px uppercase) | new `.sp-step-label` (13 px, normal case, `color: var(--text-secondary)`) |

### Mode toggle (Light / Dark)

| Property | Before | After |
|---|---|---|
| Container `border-radius` | 3 px | 7 px |
| Button padding | `4px 12px` | `5px 16px` |
| Button font-size | 10 px | 11.5 px |

### Theme cards

| Property | Before | After |
|---|---|---|
| Card `border-radius` | 5 px | 7 px |
| Preview height | 38 px | 40 px |

### Color swatches

| Property | Before | After |
|---|---|---|
| Size | 26 × 26 px | 28 × 28 px |
| Active `outline-offset` | 2 px | 3 px |

### Buttons (Cancel / Save)

| Property | Before | After |
|---|---|---|
| `padding` | `6px 14px` | `7px 16px` |
| `font-size` | 11 px | 12 px |
| `border-radius` | 3 px | 7 px |

### Folder section (JSX + CSS change)

Currently the folder name is displayed as bare text above the buttons (column layout). Change to a horizontal row: folder name in a styled pill box → inline with Change/Clear buttons.

**New markup structure** (removes the inner `.sp-folder-actions` wrapper div — buttons sit directly in `.sp-folder-set`):
```jsx
<div className="sp-folder-set">
  <span className="sp-folder-name" title={folderName}>{folderName}</span>
  <button className="sp-folder-btn" onClick={onChooseFolder} disabled={folderPending}>Change</button>
  <button className="sp-folder-btn sp-folder-btn--clear" onClick={onClearFolder}>Clear</button>
</div>
```

**New CSS for `.sp-folder-set`:** `flex-direction: row; align-items: center; gap: 8px` (delete the old `flex-direction: column` and `gap: 8px` block, replace with this)

**New CSS for `.sp-folder-name`:** `font-size: 12.5px; flex: 1; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 7px; padding: 7px 11px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap`

Folder buttons: same as `.sp-folder-btn` with new padding/radius (7px, `7px 14px`).

---

## New CSS Class

**`.sp-step-label`** (added; replaces inline `sp-field-label` used in step rows):

```css
.sp-step-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 400;
}
```

---

## Files Changed

| File | Change |
|---|---|
| `src/workspace/styles.css` | Update all `.sp-*` rule values as listed above; add `.sp-step-label` |
| `src/workspace/components/SettingsPage.tsx` | (1) Replace `className="sp-field-label" style={{ margin: 0 }}` in step rows with `className="sp-step-label"`. (2) Update `GeneralSection` folder markup to horizontal row layout. |

---

## Out of Scope

- New settings sections or fields
- Dark-mode variant of the warm palette
- Animation / transitions on the modal open
- Icon swap (unicode chars kept as-is)
