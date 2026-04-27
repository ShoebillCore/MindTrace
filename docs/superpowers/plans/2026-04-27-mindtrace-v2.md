# MindTrace v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three auto-triggering AI section panels with a chat-first side panel, and add persistent multi-color text highlighting to the article view.

**Architecture:** The right workspace panel is removed; the article takes full width by default. A floating button opens a 340px full-height `ChatPanel` alongside the article. Highlights are stored per-URL in `chrome.storage.local` and re-applied to the article DOM via `useLayoutEffect` after each change.

**Tech Stack:** React 18, TypeScript, Vite, Chrome Extension MV3, `chrome.storage.local`, `useStream` hook (unchanged), `AIProvider` interface (add `model: string`), Vitest + @testing-library/react.

---

### Task 1: Add `model` field to AIProvider and update all providers + tests

**Files:**
- Modify: `src/workspace/providers/types.ts`
- Modify: `src/workspace/providers/claude.ts`
- Modify: `src/workspace/providers/openai.ts`
- Modify: `src/workspace/providers/gemini.ts`
- Modify: `tests/unit/useStream.test.ts` (mock providers need `model`)
- Modify: `tests/unit/claude.test.ts` (verify `model` field)

- [ ] **Step 1: Update `AIProvider` interface in types.ts**

```ts
// src/workspace/providers/types.ts
export type StreamStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export type ProviderName = 'claude' | 'openai' | 'gemini'

export interface AIProvider {
  name: string
  model: string
  stream(systemPrompt: string, userContent: string): AsyncGenerator<string>
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export interface CapturedPage {
  title: string
  byline: string
  siteName: string
  content: string
  textContent: string
  excerpt: string
  wordCount: number
  isShort: boolean
  url: string
}

export interface Settings {
  selectedProvider: ProviderName
  apiKeys: Record<ProviderName, string>
}
```

- [ ] **Step 2: Add `model` to claude.ts**

Add `model: 'claude-sonnet-4-6',` to the returned object in `createClaudeProvider` (right after `name: 'Claude',`):

```ts
export function createClaudeProvider(apiKey: string): AIProvider {
  return {
    name: 'Claude',
    model: 'claude-sonnet-4-6',
    async *stream(systemPrompt: string, userContent: string) {
      // ... rest unchanged
```

- [ ] **Step 3: Add `model` to openai.ts**

```ts
export function createOpenAIProvider(apiKey: string): AIProvider {
  return {
    name: 'OpenAI',
    model: 'gpt-4o',
    async *stream(systemPrompt: string, userContent: string) {
      // ... rest unchanged
```

- [ ] **Step 4: Add `model` to gemini.ts**

```ts
export function createGeminiProvider(apiKey: string): AIProvider {
  return {
    name: 'Gemini',
    model: 'gemini-2.0-flash',
    async *stream(systemPrompt: string, userContent: string) {
      // ... rest unchanged
```

- [ ] **Step 5: Update `makeProvider` helper in useStream.test.ts**

Add `model: 'mock-model'` to every inline `AIProvider` literal in `tests/unit/useStream.test.ts`. The `makeProvider` factory and the three inline providers in the error/partial/null tests each need it:

```ts
function makeProvider(chunks: string[]): AIProvider {
  return {
    name: 'mock',
    model: 'mock-model',
    async *stream() {
      for (const chunk of chunks) yield chunk
    },
  }
}
```

Also update all inline providers (`'slow'`, `'error'`, `'ratelimit'`, `'partial'`) to include `model: 'mock-model'`.

- [ ] **Step 6: Add `model` assertion to claude.test.ts**

Add this test at the end of `tests/unit/claude.test.ts`:

```ts
test('exposes correct model name', () => {
  const provider = createClaudeProvider('key')
  expect(provider.model).toBe('claude-sonnet-4-6')
})
```

- [ ] **Step 7: Run tests and confirm they pass**

```bash
npm test
```

Expected: all 21+ tests pass, no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/workspace/providers/types.ts src/workspace/providers/claude.ts \
  src/workspace/providers/openai.ts src/workspace/providers/gemini.ts \
  tests/unit/useStream.test.ts tests/unit/claude.test.ts
git commit -m "feat: add model field to AIProvider interface"
```

---

### Task 2: `useChatHistory` hook

**Files:**
- Create: `src/workspace/hooks/useChatHistory.ts`
- Create: `tests/unit/useChatHistory.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/useChatHistory.test.ts
import { renderHook, act } from '@testing-library/react'
import { useChatHistory } from '../../src/workspace/hooks/useChatHistory'

test('starts with empty messages', () => {
  const { result } = renderHook(() => useChatHistory())
  expect(result.current.messages).toEqual([])
})

test('addUserMessage appends a user bubble and returns its id', () => {
  const { result } = renderHook(() => useChatHistory())
  let id!: string
  act(() => { id = result.current.addUserMessage('hello') })
  expect(result.current.messages).toHaveLength(1)
  expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'hello' })
  expect(result.current.messages[0].id).toBe(id)
})

test('addAssistantMessage appends a streaming assistant bubble with label', () => {
  const { result } = renderHook(() => useChatHistory())
  act(() => { result.current.addAssistantMessage('Summary') })
  expect(result.current.messages).toHaveLength(1)
  expect(result.current.messages[0]).toMatchObject({
    role: 'assistant',
    content: '',
    label: 'Summary',
    isStreaming: true,
  })
})

test('updateMessage sets content on the target message', () => {
  const { result } = renderHook(() => useChatHistory())
  let id!: string
  act(() => { id = result.current.addAssistantMessage() })
  act(() => { result.current.updateMessage(id, 'partial text') })
  expect(result.current.messages[0].content).toBe('partial text')
})

test('finalizeMessage clears isStreaming', () => {
  const { result } = renderHook(() => useChatHistory())
  let id!: string
  act(() => { id = result.current.addAssistantMessage() })
  act(() => {
    result.current.updateMessage(id, 'full text')
    result.current.finalizeMessage(id)
  })
  expect(result.current.messages[0].isStreaming).toBe(false)
  expect(result.current.messages[0].content).toBe('full text')
})

test('setStreamingError sets error content and clears isStreaming', () => {
  const { result } = renderHook(() => useChatHistory())
  let id!: string
  act(() => { id = result.current.addAssistantMessage() })
  act(() => { result.current.setStreamingError(id, 'rate limited') })
  expect(result.current.messages[0].content).toBe('rate limited')
  expect(result.current.messages[0].isStreaming).toBe(false)
})

test('messages from different calls are ordered correctly', () => {
  const { result } = renderHook(() => useChatHistory())
  act(() => {
    result.current.addUserMessage('q1')
    result.current.addAssistantMessage()
    result.current.addUserMessage('q2')
  })
  expect(result.current.messages).toHaveLength(3)
  expect(result.current.messages[0].role).toBe('user')
  expect(result.current.messages[1].role).toBe('assistant')
  expect(result.current.messages[2].role).toBe('user')
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose tests/unit/useChatHistory.test.ts
```

Expected: FAIL — `useChatHistory` not found.

- [ ] **Step 3: Implement `useChatHistory`**

```ts
// src/workspace/hooks/useChatHistory.ts
import { useState, useRef } from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  label?: 'Summary' | 'Deep Insight' | 'Questions'
  isStreaming?: boolean
}

export function useChatHistory() {
  const [messages, setMessages] = useState<Message[]>([])
  const counter = useRef(0)

  const nextId = () => String(++counter.current)

  const addUserMessage = (content: string): string => {
    const id = nextId()
    setMessages((prev) => [...prev, { id, role: 'user', content }])
    return id
  }

  const addAssistantMessage = (label?: Message['label']): string => {
    const id = nextId()
    setMessages((prev) => [
      ...prev,
      { id, role: 'assistant', content: '', label, isStreaming: true },
    ])
    return id
  }

  const updateMessage = (id: string, content: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)))
  }

  const finalizeMessage = (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isStreaming: false } : m)))
  }

  const setStreamingError = (id: string, error: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: error, isStreaming: false } : m))
    )
  }

  return { messages, addUserMessage, addAssistantMessage, updateMessage, finalizeMessage, setStreamingError }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test -- --reporter=verbose tests/unit/useChatHistory.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/workspace/hooks/useChatHistory.ts tests/unit/useChatHistory.test.ts
git commit -m "feat: add useChatHistory hook"
```

---

### Task 3: `useHighlights` hook

**Files:**
- Create: `src/workspace/hooks/useHighlights.ts`
- Create: `tests/unit/useHighlights.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/useHighlights.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useHighlights } from '../../src/workspace/hooks/useHighlights'

const URL_A = 'https://example.com/article-a'
const URL_B = 'https://example.com/article-b'

test('returns empty array when no highlights in storage', async () => {
  const { result } = renderHook(() => useHighlights(URL_A))
  await waitFor(() => expect(result.current.highlights).toEqual([]))
})

test('loads highlights for current URL only', async () => {
  await chrome.storage.local.set({
    highlights: [
      { id: '1', url: URL_A, quote: 'hello', color: 'yellow' },
      { id: '2', url: URL_B, quote: 'world', color: 'green' },
    ],
  })
  const { result } = renderHook(() => useHighlights(URL_A))
  await waitFor(() => expect(result.current.highlights).toHaveLength(1))
  expect(result.current.highlights[0]).toMatchObject({ url: URL_A, quote: 'hello', color: 'yellow' })
})

test('addHighlight updates state and calls storage.set', async () => {
  const { result } = renderHook(() => useHighlights(URL_A))
  await waitFor(() => expect(result.current.highlights).toEqual([]))

  act(() => result.current.addHighlight('some text', 'blue'))

  expect(result.current.highlights).toHaveLength(1)
  expect(result.current.highlights[0]).toMatchObject({ url: URL_A, quote: 'some text', color: 'blue' })
  expect(chrome.storage.local.set).toHaveBeenCalled()
})

test('updateHighlight changes color in state', async () => {
  await chrome.storage.local.set({
    highlights: [{ id: '1', url: URL_A, quote: 'text', color: 'yellow' }],
  })
  const { result } = renderHook(() => useHighlights(URL_A))
  await waitFor(() => expect(result.current.highlights).toHaveLength(1))

  act(() => result.current.updateHighlight('1', 'pink'))

  expect(result.current.highlights[0].color).toBe('pink')
})

test('removeHighlight removes entry from state', async () => {
  await chrome.storage.local.set({
    highlights: [{ id: '1', url: URL_A, quote: 'text', color: 'yellow' }],
  })
  const { result } = renderHook(() => useHighlights(URL_A))
  await waitFor(() => expect(result.current.highlights).toHaveLength(1))

  act(() => result.current.removeHighlight('1'))

  expect(result.current.highlights).toHaveLength(0)
})

test('preserves highlights for other URLs when mutating', async () => {
  await chrome.storage.local.set({
    highlights: [{ id: '99', url: URL_B, quote: 'other', color: 'green' }],
  })
  const { result } = renderHook(() => useHighlights(URL_A))
  await waitFor(() => expect(result.current.highlights).toHaveLength(0))

  act(() => result.current.addHighlight('new', 'purple'))

  await waitFor(() => {
    const lastSetCall = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls.at(-1)
    const saved = lastSetCall?.[0]?.highlights ?? []
    expect(saved.some((h: { url: string }) => h.url === URL_B)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose tests/unit/useHighlights.test.ts
```

Expected: FAIL — `useHighlights` not found.

- [ ] **Step 3: Implement `useHighlights`**

```ts
// src/workspace/hooks/useHighlights.ts
import { useState, useEffect } from 'react'

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'

export interface Highlight {
  id: string
  url: string
  quote: string
  color: HighlightColor
}

export function useHighlights(url: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([])

  useEffect(() => {
    if (!url) return
    chrome.storage.local.get('highlights').then((data) => {
      const all = (data.highlights as Highlight[]) ?? []
      setHighlights(all.filter((h) => h.url === url))
    })
  }, [url])

  const persist = (nextForUrl: Highlight[]) => {
    setHighlights(nextForUrl)
    chrome.storage.local.get('highlights').then((data) => {
      const others = ((data.highlights as Highlight[]) ?? []).filter((h) => h.url !== url)
      chrome.storage.local.set({ highlights: [...others, ...nextForUrl] })
    })
  }

  const addHighlight = (quote: string, color: HighlightColor) => {
    const h: Highlight = { id: Date.now().toString(), url, quote, color }
    persist([...highlights, h])
  }

  const updateHighlight = (id: string, color: HighlightColor) => {
    persist(highlights.map((h) => (h.id === id ? { ...h, color } : h)))
  }

  const removeHighlight = (id: string) => {
    persist(highlights.filter((h) => h.id !== id))
  }

  return { highlights, addHighlight, updateHighlight, removeHighlight }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test -- --reporter=verbose tests/unit/useHighlights.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/workspace/hooks/useHighlights.ts tests/unit/useHighlights.test.ts
git commit -m "feat: add useHighlights hook with chrome.storage.local persistence"
```

---

### Task 4: Add chat panel and highlight CSS to styles.css

**Files:**
- Modify: `src/workspace/styles.css`

- [ ] **Step 1: Update `.article-panel` and add all new CSS**

Replace the `.article-panel` rule and add new sections. The full diff to `styles.css`:

Replace this block:
```css
.article-panel {
  width: 48%;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 36px 32px;
}
```

With:
```css
.article-panel {
  flex: 1;
  overflow-y: auto;
  padding: 36px 32px;
  position: relative;
}
```

Then append the following to the end of `styles.css`:

```css
/* ── Chat open button ──────────────────────── */

.chat-open-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent-purple);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  z-index: 100;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-open-btn:hover {
  filter: brightness(1.15);
}

/* ── Chat panel ────────────────────────────── */

.chat-panel {
  width: 340px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-status-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  flex-shrink: 0;
}

.chat-provider-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.chat-model-badge {
  background: var(--bg-primary);
  color: var(--accent-purple);
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--accent-purple) 30%, transparent);
}

.chat-close-btn {
  width: 24px;
  height: 24px;
  background: var(--bg-hover);
  border: none;
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chat-close-btn:hover {
  color: var(--text-primary);
}

/* ── Quick actions ─────────────────────────── */

.quick-actions {
  display: flex;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.quick-action-btn {
  background: var(--bg-primary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}

.quick-action-btn:hover:not(:disabled) {
  border-color: var(--accent-purple);
  color: var(--accent-purple);
}

.quick-action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Message list ──────────────────────────── */

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message-list-empty {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  margin: auto;
  padding: 24px;
  line-height: 1.6;
}

/* ── Chat messages ─────────────────────────── */

.chat-message {
  display: flex;
  flex-direction: column;
  max-width: 90%;
}

.chat-message--user {
  align-self: flex-end;
  background: color-mix(in srgb, var(--accent-purple) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-purple) 30%, transparent);
  border-radius: 12px 12px 2px 12px;
  padding: 8px 12px;
}

.chat-message--user p {
  font-size: 12px;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.6;
}

.chat-message--assistant {
  align-self: flex-start;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 2px 12px 12px 12px;
  padding: 10px 12px;
  width: 100%;
}

.chat-message-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  margin-bottom: 6px;
}

.chat-message-content {
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-secondary);
  margin: 0;
  white-space: pre-wrap;
}

.chat-skeleton {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Chat input ────────────────────────────── */

.chat-input-area {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 12px 14px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.chat-textarea {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-primary);
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;
}

.chat-textarea:focus {
  border-color: var(--accent-purple);
}

.chat-textarea::placeholder {
  color: var(--text-muted);
}

.chat-send-btn {
  width: 32px;
  height: 32px;
  background: var(--accent-purple);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chat-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Highlights ────────────────────────────── */

.hl-yellow { background: rgba(250, 204, 21, 0.35); border-radius: 2px; }
.hl-green  { background: rgba(74, 222, 128, 0.35); border-radius: 2px; }
.hl-blue   { background: rgba(96, 165, 250, 0.35); border-radius: 2px; }
.hl-pink   { background: rgba(244, 114, 182, 0.35); border-radius: 2px; }
.hl-purple { background: rgba(167, 139, 250, 0.35); border-radius: 2px; }

[data-highlight-id]:hover {
  filter: brightness(1.2);
  cursor: pointer;
}

/* ── Highlight popup ───────────────────────── */

.highlight-popup {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  z-index: 500;
  transform: translateX(-50%);
}

.highlight-color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.highlight-color-dot:hover {
  border-color: #fff;
  transform: scale(1.15);
}

.highlight-popup-divider {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 2px;
}

.highlight-delete-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  color: #ef4444;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
}

.highlight-delete-btn:hover {
  background: rgba(239, 68, 68, 0.3);
}
```

- [ ] **Step 2: Build to confirm no CSS parse errors**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ All steps completed.`

- [ ] **Step 3: Commit**

```bash
git add src/workspace/styles.css
git commit -m "feat: add chat panel and highlight CSS styles"
```

---

### Task 5: `HighlightPopup` component

**Files:**
- Create: `src/workspace/components/HighlightPopup.tsx`

- [ ] **Step 1: Create HighlightPopup**

```tsx
// src/workspace/components/HighlightPopup.tsx
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

interface HighlightPopupProps {
  position: { top: number; left: number }
  mode: 'new' | 'edit'
  onColorSelect: (color: HighlightColor) => void
  onDelete?: () => void
  onDismiss: () => void
}

export default function HighlightPopup({
  position,
  mode,
  onColorSelect,
  onDelete,
  onDismiss,
}: HighlightPopupProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onDismiss])

  return createPortal(
    <div
      ref={ref}
      className="highlight-popup"
      style={{ top: position.top, left: position.left }}
    >
      {COLORS.map(({ color, hex }) => (
        <button
          key={color}
          className="highlight-color-dot"
          style={{ background: hex }}
          onClick={() => onColorSelect(color)}
          aria-label={`Highlight ${color}`}
        />
      ))}
      {mode === 'edit' && onDelete && (
        <>
          <div className="highlight-popup-divider" />
          <button
            className="highlight-delete-btn"
            onClick={onDelete}
            aria-label="Remove highlight"
          >
            ✕
          </button>
        </>
      )}
    </div>,
    document.body,
  )
}
```

- [ ] **Step 2: Build to confirm no TypeScript errors**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ All steps completed.`

- [ ] **Step 3: Commit**

```bash
git add src/workspace/components/HighlightPopup.tsx
git commit -m "feat: add HighlightPopup component with portal rendering"
```

---

### Task 6: Chat sub-components (ChatHeader, QuickActions, ChatMessage, MessageList, ChatInput)

**Files:**
- Create: `src/workspace/components/ChatHeader.tsx`
- Create: `src/workspace/components/QuickActions.tsx`
- Create: `src/workspace/components/ChatMessage.tsx`
- Create: `src/workspace/components/MessageList.tsx`
- Create: `src/workspace/components/ChatInput.tsx`

- [ ] **Step 1: Create ChatHeader**

```tsx
// src/workspace/components/ChatHeader.tsx
import type { AIProvider } from '../providers/types'

interface ChatHeaderProps {
  provider: AIProvider
  onClose: () => void
}

export default function ChatHeader({ provider, onClose }: ChatHeaderProps) {
  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <span className="chat-status-dot" />
        <span className="chat-provider-name">{provider.name}</span>
        <span className="chat-model-badge">{provider.model}</span>
      </div>
      <button className="chat-close-btn" onClick={onClose} aria-label="Close chat">
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create QuickActions**

```tsx
// src/workspace/components/QuickActions.tsx
import type { Message } from '../hooks/useChatHistory'

export const QUICK_SYSTEM_PROMPTS: Record<string, string> = {
  Summary:
    'You are a precise reading assistant. Summarize the article in 3-5 sentences. Focus on the core argument, key evidence, and main conclusion. Be concise.',
  'Deep Insight':
    'You are an analytical reading assistant. Identify 3 deeper insights, implications, or connections that a thoughtful reader would find valuable. Go beyond surface-level summary.',
  Questions:
    'You are a Socratic reading assistant. Generate 5 thought-provoking questions about the article that encourage critical thinking and deeper understanding.',
}

const ACTIONS: NonNullable<Message['label']>[] = ['Summary', 'Deep Insight', 'Questions']

interface QuickActionsProps {
  disabled: boolean
  onAction: (label: NonNullable<Message['label']>, systemPrompt: string) => void
}

export default function QuickActions({ disabled, onAction }: QuickActionsProps) {
  return (
    <div className="quick-actions">
      {ACTIONS.map((label) => (
        <button
          key={label}
          className="quick-action-btn"
          disabled={disabled}
          onClick={() => onAction(label, QUICK_SYSTEM_PROMPTS[label])}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create ChatMessage**

```tsx
// src/workspace/components/ChatMessage.tsx
import type { Message } from '../hooks/useChatHistory'

const LABEL_COLORS: Record<string, string> = {
  Summary: 'var(--accent-purple)',
  'Deep Insight': 'var(--accent-blue)',
  Questions: 'var(--accent-green)',
}

export default function ChatMessage({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="chat-message chat-message--user">
        <p>{message.content}</p>
      </div>
    )
  }

  return (
    <div className="chat-message chat-message--assistant">
      {message.label && (
        <div
          className="chat-message-label"
          style={{ color: LABEL_COLORS[message.label] ?? 'var(--text-muted)' }}
        >
          {message.label}
        </div>
      )}
      {message.isStreaming && !message.content ? (
        <div className="chat-skeleton">
          <div className="skeleton-line" style={{ width: '90%' }} />
          <div className="skeleton-line" style={{ width: '75%' }} />
          <div className="skeleton-line" style={{ width: '83%' }} />
        </div>
      ) : (
        <p className="chat-message-content">{message.content}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create MessageList**

```tsx
// src/workspace/components/MessageList.tsx
import { useEffect, useRef } from 'react'
import type { Message } from '../hooks/useChatHistory'
import ChatMessage from './ChatMessage'

export default function MessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="message-list">
      {messages.length === 0 && (
        <p className="message-list-empty">
          Use a quick action above or ask anything about this article.
        </p>
      )}
      {messages.map((m) => (
        <ChatMessage key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 5: Create ChatInput**

```tsx
// src/workspace/components/ChatInput.tsx
import { useState } from 'react'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-input-area">
      <textarea
        className="chat-textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
        disabled={disabled}
        rows={1}
      />
      <button
        className="chat-send-btn"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="Send"
      >
        ↑
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Build to confirm no TypeScript errors**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ All steps completed.`

- [ ] **Step 7: Commit**

```bash
git add src/workspace/components/ChatHeader.tsx \
  src/workspace/components/QuickActions.tsx \
  src/workspace/components/ChatMessage.tsx \
  src/workspace/components/MessageList.tsx \
  src/workspace/components/ChatInput.tsx
git commit -m "feat: add chat sub-components (ChatHeader, QuickActions, ChatMessage, MessageList, ChatInput)"
```

---

### Task 7: `ChatPanel` component

**Files:**
- Create: `src/workspace/components/ChatPanel.tsx`

- [ ] **Step 1: Create ChatPanel**

```tsx
// src/workspace/components/ChatPanel.tsx
import { useEffect, useRef } from 'react'
import { useStream } from '../hooks/useStream'
import { useChatHistory } from '../hooks/useChatHistory'
import type { Message } from '../hooks/useChatHistory'
import type { AIProvider, CapturedPage } from '../providers/types'
import ChatHeader from './ChatHeader'
import QuickActions from './QuickActions'
import MessageList from './MessageList'
import ChatInput from './ChatInput'

const CHAT_SYSTEM_PROMPT = (articleText: string) =>
  `You are a helpful reading assistant. Answer questions about the following article concisely and accurately:\n\n${articleText.slice(0, 8000)}`

interface ChatPanelProps {
  page: CapturedPage | null
  provider: AIProvider | null
  onClose: () => void
  onSettingsOpen: () => void
}

export default function ChatPanel({ page, provider, onClose, onSettingsOpen }: ChatPanelProps) {
  const { messages, addUserMessage, addAssistantMessage, updateMessage, finalizeMessage, setStreamingError } =
    useChatHistory()
  const stream = useStream(provider)
  const assistantIdRef = useRef<string | null>(null)
  const isStreaming = stream.status === 'loading' || stream.status === 'streaming'

  useEffect(() => {
    const id = assistantIdRef.current
    if (!id) return
    if (stream.status === 'done') {
      updateMessage(id, stream.text)
      finalizeMessage(id)
      assistantIdRef.current = null
    } else if (stream.status === 'error') {
      setStreamingError(id, stream.error ?? 'Something went wrong.')
      assistantIdRef.current = null
    } else {
      updateMessage(id, stream.text)
    }
  }, [stream.text, stream.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickAction = (label: NonNullable<Message['label']>, systemPrompt: string) => {
    if (!page || isStreaming) return
    const id = addAssistantMessage(label)
    assistantIdRef.current = id
    stream.start(systemPrompt, page.textContent.slice(0, 8000))
  }

  const handleUserMessage = (text: string) => {
    if (!page || isStreaming || !text.trim()) return
    addUserMessage(text)
    const id = addAssistantMessage()
    assistantIdRef.current = id
    stream.start(CHAT_SYSTEM_PROMPT(page.textContent), text)
  }

  if (!provider) {
    return (
      <div className="chat-panel">
        <div className="chat-header">
          <span className="chat-provider-name">Chat</span>
          <button className="chat-close-btn" onClick={onClose} aria-label="Close chat">
            ✕
          </button>
        </div>
        <div className="no-key-prompt">
          <p>Enter an API key to activate the AI workspace.</p>
          <button onClick={onSettingsOpen}>Open Settings</button>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-panel">
      <ChatHeader provider={provider} onClose={onClose} />
      <QuickActions disabled={isStreaming || !page} onAction={handleQuickAction} />
      <MessageList messages={messages} />
      <ChatInput onSend={handleUserMessage} disabled={isStreaming || !page} />
    </div>
  )
}
```

- [ ] **Step 2: Build to confirm no TypeScript errors**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ All steps completed.`

- [ ] **Step 3: Commit**

```bash
git add src/workspace/components/ChatPanel.tsx
git commit -m "feat: add ChatPanel component"
```

---

### Task 8: Update ArticlePanel with highlight integration

**Files:**
- Modify: `src/workspace/components/ArticlePanel.tsx`

- [ ] **Step 1: Replace ArticlePanel with the full updated version**

```tsx
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
          onColorSelect={handleColorSelect}
          onDelete={popup.mode === 'edit' ? handleDelete : undefined}
          onDismiss={() => setPopup(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build to confirm no TypeScript errors**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ All steps completed.`

- [ ] **Step 3: Commit**

```bash
git add src/workspace/components/ArticlePanel.tsx
git commit -m "feat: add highlight selection and DOM application to ArticlePanel"
```

---

### Task 9: Wire App.tsx and delete old files

**Files:**
- Modify: `src/workspace/App.tsx`
- Delete: `src/workspace/components/WorkspacePanel.tsx`
- Delete: `src/workspace/components/SummarySection.tsx`
- Delete: `src/workspace/components/QuestionsSection.tsx`
- Delete: `src/workspace/components/InsightsSection.tsx`
- Delete: `src/workspace/components/QuestionCard.tsx`

- [ ] **Step 1: Replace App.tsx**

```tsx
// src/workspace/App.tsx
import { useEffect, useState } from 'react'
import { useTheme } from './hooks/useTheme'
import { useSettings } from './hooks/useSettings'
import { createClaudeProvider } from './providers/claude'
import { createOpenAIProvider } from './providers/openai'
import { createGeminiProvider } from './providers/gemini'
import type { AIProvider, CapturedPage } from './providers/types'
import Header from './components/Header'
import ArticlePanel from './components/ArticlePanel'
import ChatPanel from './components/ChatPanel'
import SettingsDrawer from './components/SettingsDrawer'

function getProvider(name: string, apiKey: string): AIProvider {
  switch (name) {
    case 'openai': return createOpenAIProvider(apiKey)
    case 'gemini': return createGeminiProvider(apiKey)
    default:       return createClaudeProvider(apiKey)
  }
}

export default function App() {
  const { theme, setTheme } = useTheme()
  const { settings, saveSettings, loaded: settingsLoaded } = useSettings()
  const [page, setPage] = useState<CapturedPage | null>(null)
  const [pageLoaded, setPageLoaded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    let done = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const handleChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === 'local' && changes.capturedPage?.newValue && !done) {
        done = true
        if (timer) clearTimeout(timer)
        chrome.storage.onChanged.removeListener(handleChange)
        setPage(changes.capturedPage.newValue as CapturedPage)
        setPageLoaded(true)
      }
    }

    chrome.storage.local.get('capturedPage').then((data) => {
      if (done) return
      if (data.capturedPage) {
        done = true
        setPage(data.capturedPage as CapturedPage)
        setPageLoaded(true)
        return
      }
      chrome.storage.onChanged.addListener(handleChange)
      timer = setTimeout(() => {
        if (!done) {
          done = true
          chrome.storage.onChanged.removeListener(handleChange)
          setPageLoaded(true)
        }
      }, 3000)
    })

    return () => {
      done = true
      if (timer) clearTimeout(timer)
      chrome.storage.onChanged.removeListener(handleChange)
    }
  }, [])

  if (!pageLoaded || !settingsLoaded) {
    return <div className="loading">Loading…</div>
  }

  const currentKey = settings.apiKeys[settings.selectedProvider]
  const provider = currentKey
    ? getProvider(settings.selectedProvider, currentKey)
    : null

  return (
    <div className="app" data-theme={theme}>
      {page?.isShort && (
        <div className="warning-banner">Short content — AI responses may be limited.</div>
      )}
      <Header
        page={page}
        settings={settings}
        theme={theme}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onProviderChange={(p) => saveSettings({ selectedProvider: p })}
        onSettingsOpen={() => setSettingsOpen(true)}
      />
      <main className="workspace-layout">
        <ArticlePanel page={page} />
        {chatOpen && (
          <ChatPanel
            page={page}
            provider={provider}
            onClose={() => setChatOpen(false)}
            onSettingsOpen={() => setSettingsOpen(true)}
          />
        )}
      </main>
      {!chatOpen && page && (
        <button
          className="chat-open-btn"
          onClick={() => setChatOpen(true)}
          title="Open AI Chat"
        >
          💬
        </button>
      )}
      {settingsOpen && (
        <SettingsDrawer
          settings={settings}
          onSave={(apiKeys) => saveSettings({ apiKeys })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Delete old components**

```bash
rm src/workspace/components/WorkspacePanel.tsx \
   src/workspace/components/SummarySection.tsx \
   src/workspace/components/QuestionsSection.tsx \
   src/workspace/components/InsightsSection.tsx \
   src/workspace/components/QuestionCard.tsx
```

- [ ] **Step 3: Build and confirm clean**

```bash
npm run build 2>&1 | tail -8
```

Expected: `✓ All steps completed.` with no TypeScript errors.

- [ ] **Step 4: Run all unit tests**

```bash
npm test
```

Expected: all tests pass (previous 21 + 7 useChatHistory + 6 useHighlights = 34 tests).

- [ ] **Step 5: Run E2E tests**

```bash
nvm use 24.15.0 && npm run test:e2e
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/workspace/App.tsx
git add -u src/workspace/components/
git commit -m "feat: wire ChatPanel into App, remove old workspace panel components"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Chat panel: ChatPanel + sub-components (Tasks 6–7)
- ✅ Full-height side panel at 340px: Task 4 CSS
- ✅ Provider name + model badge in header: Task 6 (ChatHeader)
- ✅ ✕ close button top-right: ChatHeader
- ✅ Quick actions (Summary, Deep Insight, Questions): QuickActions
- ✅ Free-form chat: ChatInput + ChatPanel.handleUserMessage
- ✅ Streaming wired via useStream + useEffect: ChatPanel Task 7
- ✅ No-provider state: ChatPanel fallback
- ✅ Floating chat open button (fixed bottom-right): App.tsx Task 9
- ✅ article takes full width by default: .article-panel { flex: 1 }
- ✅ Highlights: useHighlights (Task 3) + ArticlePanel (Task 8) + HighlightPopup (Task 5)
- ✅ 5 colors: Task 4 CSS
- ✅ Persist by URL in chrome.storage.local: useHighlights
- ✅ Click → popup → change color or delete: ArticlePanel + HighlightPopup
- ✅ DOM application via TreeWalker + splitText: ArticlePanel useLayoutEffect
- ✅ Delete old files: Task 9
- ✅ model field on AIProvider: Task 1
- ✅ Unit tests for useChatHistory and useHighlights: Tasks 2–3
