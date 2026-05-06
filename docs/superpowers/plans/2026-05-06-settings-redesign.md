# Settings Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the settings modal from 640 px to 780 px with larger fonts, more rounded controls, warmer spacing, and a polished folder row — a pure CSS + two-line JSX change.

**Architecture:** Two files only. `SettingsPage.tsx` gets two small JSX tweaks (step row labels + folder markup). `styles.css` gets targeted value updates across all `.sp-*` rules. No new components, no logic changes.

**Tech Stack:** React 18, TypeScript, plain CSS custom properties (`--bg-primary`, `--bg-secondary`, `--border`, `--text-primary`, `--text-secondary`, `--text-muted`). Build: `npm run build`.

---

## File Map

| File | What changes |
|---|---|
| `src/workspace/components/SettingsPage.tsx` | (1) Step-row labels: `className="sp-field-label" style={{ margin: 0 }}` → `className="sp-step-label"`. (2) Folder "has folder" JSX: remove inner `.sp-folder-actions` wrapper, buttons go directly in `.sp-folder-set`. |
| `src/workspace/styles.css` | All `.sp-*` value updates (width, radius, padding, font-size, shadow). Add `.sp-step-label` and `.sp-section-title + .sp-field-label` rules. |

---

## Task 1 — Update `SettingsPage.tsx`

**Files:**
- Modify: `src/workspace/components/SettingsPage.tsx`

Two independent edits: (a) step-row labels, (b) folder section markup.

- [ ] **Step 1a: Replace step-row label classNames**

In `ReaderSection` (around lines 221 and 236), both `<span>` elements that label the stepper rows currently read:

```tsx
<span className="sp-field-label" style={{ margin: 0 }}>Font Size</span>
```
and
```tsx
<span className="sp-field-label" style={{ margin: 0 }}>Content Width</span>
```

Replace both so they read:

```tsx
<span className="sp-step-label">Font Size</span>
```
```tsx
<span className="sp-step-label">Content Width</span>
```

- [ ] **Step 1b: Flatten the folder "has folder" JSX**

In `GeneralSection` (around lines 368–379), the "folder already chosen" branch currently is:

```tsx
<div className="sp-folder-set">
  <span className="sp-folder-name" title={folderName}>[{folderName}]</span>
  <div className="sp-folder-actions">
    <button className="sp-folder-btn" onClick={onChooseFolder} disabled={folderPending}>
      Change
    </button>
    <button className="sp-folder-btn sp-folder-btn--clear" onClick={onClearFolder}>
      Clear
    </button>
  </div>
</div>
```

Replace it with (remove the inner `sp-folder-actions` div, drop the brackets around the name):

```tsx
<div className="sp-folder-set">
  <span className="sp-folder-name" title={folderName}>{folderName}</span>
  <button className="sp-folder-btn" onClick={onChooseFolder} disabled={folderPending}>
    Change
  </button>
  <button className="sp-folder-btn sp-folder-btn--clear" onClick={onClearFolder}>
    Clear
  </button>
</div>
```

- [ ] **Step 1c: Build to confirm no TypeScript errors**

```bash
cd /Users/chengjing/Desktop/Github/MindTrace && npm run build 2>&1 | tail -8
```

Expected: `✓ All steps completed.` — no error lines.

- [ ] **Step 1d: Commit**

```bash
git add src/workspace/components/SettingsPage.tsx
git commit -m "feat: settings — step labels + flattened folder row JSX"
```

---

## Task 2 — CSS: Modal shell, header, footer, sidebar

**Files:**
- Modify: `src/workspace/styles.css` (Settings Page section, lines ~1710–1820)

- [ ] **Step 2a: Update `.sp-modal`**

Find:
```css
.sp-modal {
  background: var(--bg-primary);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 640px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 80px);
}
```

Replace with:
```css
.sp-modal {
  background: var(--bg-primary);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 780px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 80px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
}
```

- [ ] **Step 2b: Update `.sp-header` padding**

Find:
```css
  padding: 11px 18px;
```
(inside `.sp-header`)

Replace with:
```css
  padding: 14px 22px;
```

- [ ] **Step 2c: Update `.sp-title` font-size**

Find:
```css
.sp-title {
  font-size: 12px;
```

Replace with:
```css
.sp-title {
  font-size: 13px;
```

- [ ] **Step 2d: Update `.sp-nav` width**

Find:
```css
  width: 118px;
```
(inside `.sp-nav`)

Replace with:
```css
  width: 150px;
```

- [ ] **Step 2e: Update `.sp-nav-item` size and border**

Find:
```css
.sp-nav-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  font-size: 11px;
  color: var(--text-muted);
  background: none;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  text-align: left;
  width: 100%;
  font-family: inherit;
}
```

Replace with:
```css
.sp-nav-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  font-size: 12.5px;
  color: var(--text-muted);
  background: none;
  border: none;
  border-left: 3px solid transparent;
  cursor: pointer;
  text-align: left;
  width: 100%;
  font-family: inherit;
}
```

- [ ] **Step 2f: Update `.sp-footer` padding**

Find:
```css
  padding: 10px 18px;
```
(inside `.sp-footer`)

Replace with:
```css
  padding: 12px 22px;
```

- [ ] **Step 2g: Build to confirm no errors**

```bash
npm run build 2>&1 | tail -8
```

Expected: `✓ All steps completed.`

- [ ] **Step 2h: Commit**

```bash
git add src/workspace/styles.css
git commit -m "feat: settings — larger modal shell, header/footer, sidebar"
```

---

## Task 3 — CSS: Content panel, field labels, notes, inputs, selects

**Files:**
- Modify: `src/workspace/styles.css`

- [ ] **Step 3a: Update `.sp-content` padding**

Find:
```css
  padding: 18px 20px;
```
(inside `.sp-content`)

Replace with:
```css
  padding: 22px 26px;
```

- [ ] **Step 3b: Update `.sp-section-title`**

Find:
```css
.sp-section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 14px;
  letter-spacing: 0.3px;
}
```

Replace with:
```css
.sp-section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 18px;
  letter-spacing: 0.3px;
}
```

- [ ] **Step 3c: Update `.sp-field-label` and add adjacent-sibling override**

Find:
```css
.sp-field-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-bottom: 6px;
}
```

Replace with:
```css
.sp-field-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-bottom: 8px;
  margin-top: 14px;
}

.sp-section-title + .sp-field-label {
  margin-top: 0;
}
```

- [ ] **Step 3d: Update `.sp-note` font-size**

Find:
```css
.sp-note {
  font-size: 10px;
```

Replace with:
```css
.sp-note {
  font-size: 10.5px;
```

- [ ] **Step 3e: Update `.sp-input`**

Find:
```css
.sp-input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 6px 9px;
  font-size: 11px;
  font-family: inherit;
  color: var(--text-primary);
  outline: none;
}
```

Replace with:
```css
.sp-input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 8px 11px;
  font-size: 12.5px;
  font-family: inherit;
  color: var(--text-primary);
  outline: none;
}
```

- [ ] **Step 3f: Update `.sp-select`**

Find:
```css
.sp-select {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 6px 9px;
  font-size: 11px;
  font-family: inherit;
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23646262' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 9px center;
  padding-right: 28px;
  margin-bottom: 12px;
}
```

Replace with:
```css
.sp-select {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 8px 11px;
  font-size: 12.5px;
  font-family: inherit;
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23646262' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 11px center;
  padding-right: 30px;
  margin-bottom: 12px;
}
```

- [ ] **Step 3g: Build to confirm no errors**

```bash
npm run build 2>&1 | tail -8
```

Expected: `✓ All steps completed.`

- [ ] **Step 3h: Commit**

```bash
git add src/workspace/styles.css
git commit -m "feat: settings — larger content panel, field labels, inputs/selects"
```

---

## Task 4 — CSS: Controls, swatches, mode, themes, folder, buttons; add `.sp-step-label`

**Files:**
- Modify: `src/workspace/styles.css`

- [ ] **Step 4a: Update `.sp-swatch` size**

Find:
```css
.sp-swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  outline: none;
}
```

Replace with:
```css
.sp-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  outline: none;
}
```

- [ ] **Step 4b: Update `.sp-swatch.active` outline-offset**

Find:
```css
.sp-swatch.active {
  outline: 2.5px solid var(--text-primary);
  outline-offset: 2px;
}
```

Replace with:
```css
.sp-swatch.active {
  outline: 2.5px solid var(--text-primary);
  outline-offset: 3px;
}
```

- [ ] **Step 4c: Update `.sp-step-btn`**

Find:
```css
.sp-step-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 3px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}
```

Replace with:
```css
.sp-step-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}
```

- [ ] **Step 4d: Update `.sp-step-val` font-size**

Find:
```css
.sp-step-val {
  font-size: 11px;
```

Replace with:
```css
.sp-step-val {
  font-size: 13px;
```

- [ ] **Step 4e: Update `.sp-mode-pill` border-radius**

Find:
```css
.sp-mode-pill {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 3px;
  overflow: hidden;
  width: fit-content;
  margin-bottom: 14px;
}
```

Replace with:
```css
.sp-mode-pill {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 7px;
  overflow: hidden;
  width: fit-content;
  margin-bottom: 14px;
}
```

- [ ] **Step 4f: Update `.sp-mode-btn` padding and font-size**

Find:
```css
.sp-mode-btn {
  padding: 4px 12px;
  font-size: 10px;
  font-family: inherit;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}
```

Replace with:
```css
.sp-mode-btn {
  padding: 5px 16px;
  font-size: 11.5px;
  font-family: inherit;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}
```

- [ ] **Step 4g: Update `.sp-theme` border-radius**

Find:
```css
.sp-theme {
  border: 1.5px solid var(--border);
  border-radius: 5px;
```

Replace with:
```css
.sp-theme {
  border: 1.5px solid var(--border);
  border-radius: 7px;
```

- [ ] **Step 4h: Update `.sp-theme-preview` height**

Find:
```css
.sp-theme-preview {
  height: 38px;
```

Replace with:
```css
.sp-theme-preview {
  height: 40px;
```

- [ ] **Step 4i: Update `.sp-folder-set` to horizontal layout**

Find:
```css
.sp-folder-set {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

Replace with:
```css
.sp-folder-set {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
```

- [ ] **Step 4j: Update `.sp-folder-name` to styled pill**

Find:
```css
.sp-folder-name {
  font-size: 11px;
  color: var(--text-secondary);
  word-break: break-all;
}
```

Replace with:
```css
.sp-folder-name {
  font-size: 12.5px;
  flex: 1;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 7px 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 4k: Update `.sp-folder-btn` size**

Find:
```css
.sp-folder-btn {
  padding: 5px 10px;
  font-size: 11px;
  font-family: inherit;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
}
```

Replace with:
```css
.sp-folder-btn {
  padding: 7px 14px;
  font-size: 12px;
  font-family: inherit;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
}
```

- [ ] **Step 4l: Update `.sp-btn` (Cancel / Save)**

Find:
```css
.sp-btn {
  padding: 6px 14px;
  border-radius: 3px;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}
```

Replace with:
```css
.sp-btn {
  padding: 7px 16px;
  border-radius: 7px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
```

- [ ] **Step 4m: Add `.sp-step-label` rule**

Find the `/* Step controls */` comment (just before `.sp-step-row`). Insert the new rule immediately after the comment line:

```css
/* Step controls */
.sp-step-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 400;
}

.sp-step-row {
```

- [ ] **Step 4n: Build — expect clean output**

```bash
npm run build 2>&1 | tail -8
```

Expected: `✓ All steps completed.`

- [ ] **Step 4o: Commit**

```bash
git add src/workspace/styles.css
git commit -m "feat: settings — controls, swatches, mode, themes, folder, buttons, step-label"
```

---

## Task 5 — Full build verification + visual smoke-test

- [ ] **Step 5a: Full clean build**

```bash
npm run build 2>&1
```

Expected: ends with `✓ All steps completed.` — zero TypeScript errors, zero missing module errors.

- [ ] **Step 5b: Visual smoke-test checklist**

Load the extension in Chrome (`chrome://extensions` → reload). Open any captured article and click the settings gear. Verify:

1. Modal is noticeably wider (780 px) with rounded corners (14 px radius) ✓
2. Modal has a soft drop shadow visible against the page ✓
3. Sidebar is wider; nav items are larger, easier to read ✓
4. Section titles are 14 px — clearly bigger than before ✓
5. "Default Color" swatches are 28 px dots ✓
6. Reader section: "Font Size" and "Content Width" labels are 13 px normal-case (not 9 px uppercase) ✓
7. Step +/− buttons are 28 × 28 px with 6 px radius ✓
8. Light/Dark mode pill has 7 px radius ✓
9. Theme cards have slightly taller preview strip (40 px) ✓
10. Interpreter dropdowns and API key input are taller (8 px padding) with 7 px radius ✓
11. General tab: folder name appears in a styled box inline with Change / Clear buttons ✓
12. Cancel / Save buttons in footer are 12 px, 7 px radius ✓
13. Dark mode still works — themes switch correctly ✓
14. Save and Cancel still function — no regressions ✓

- [ ] **Step 5c: Final commit if any tweaks needed**

```bash
git add -p
git commit -m "fix: settings redesign smoke-test adjustments"
```
