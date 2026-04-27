# MindTrace v2 — Chat-First Workspace & Highlights

## Goal

Replace the auto-triggering AI section panels with a chat-first interface, and add persistent text highlighting to the article panel.

## Architecture

The workspace right panel is eliminated. The article takes full width by default. A floating button opens a full-height side chat panel. A separate highlight system lets users mark up the article text with five colors, persisted per URL in `chrome.storage.local`.

## Tech Stack

React 18, TypeScript, Vite, Chrome Extension MV3, `chrome.storage.local`, existing `useStream` hook and `AIProvider` interface (minimally extended).

---

## Feature 1: Chat Panel

### Layout

- **Default state:** article panel takes full width; a floating purple button (bottom-right of article area) opens the chat.
- **Chat open:** article narrows (flex 1), chat panel appears at 340px fixed width on the right, full screen height.
- `App.tsx` tracks `chatOpen: boolean`; passes it and `onChatOpen` / `onChatClose` callbacks down.

### ChatPanel component tree

```
ChatPanel
  ├── ChatHeader       — provider name, model badge, ✕ close button
  ├── QuickActions     — "Summary", "Deep Insight", "Questions" pill buttons
  ├── MessageList      — scrollable thread
  │     └── ChatMessage  — role-aware bubble (user right, assistant left)
  └── ChatInput        — textarea + send button
```

### ChatHeader

Displays:
- Green status dot
- Provider name capitalized: `"Claude"` / `"OpenAI"` / `"Gemini"` (from `provider.name`)
- Model badge: `provider.model` (e.g. `claude-sonnet-4-6`, `gpt-4o`, `gemini-2.0-flash`)
- ✕ button (`onClick: onClose`) top-right

### QuickActions

Three pill buttons: **Summary**, **Deep Insight**, **Questions**. Each fires a pre-canned prompt via `sendMessage`. Disabled while a response is streaming.

Pre-canned system prompts (same content as the old sections):
- **Summary:** "You are a precise reading assistant. Summarize the article in 3–5 sentences. Focus on the core argument, key evidence, and main conclusion. Be concise."
- **Deep Insight:** "You are an analytical reading assistant. Identify 3 deeper insights, implications, or connections that a thoughtful reader would find valuable. Go beyond surface-level summary."
- **Questions:** "You are a Socratic reading assistant. Generate 5 thought-provoking questions about the article that encourage critical thinking and deeper understanding."

### Message model

```ts
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  label?: 'Summary' | 'Deep Insight' | 'Questions'  // set for quick-action responses
  isStreaming?: boolean
}
```

### useChatHistory hook

```ts
function useChatHistory(): {
  messages: Message[]
  addUserMessage: (content: string) => string        // returns id
  addAssistantMessage: (label?: string) => string    // returns id, starts with ''
  updateMessage: (id: string, content: string) => void
  finalizeMessage: (id: string) => void
  setStreamingError: (id: string, error: string) => void
}
```

State is React-only (`useState`). No persistence — history resets each workspace session.

### Chat data flow

1. User types message or clicks quick action.
2. `addUserMessage(content)` appends the user bubble.
3. `addAssistantMessage(label?)` appends an empty streaming assistant bubble.
4. `useStream.start(systemPrompt, userContent)` begins streaming.
   - User message: `systemPrompt` = pre-canned article context instruction + article `textContent` (first 8000 chars); `userContent` = user message text.
   - Quick action: `systemPrompt` = pre-canned task prompt; `userContent` = article `textContent` (first 8000 chars).
5. `ChatPanel` has a `useEffect` watching `[useStream.text, useStream.status]`. On each change it calls `updateMessage(assistantId, useStream.text)`.
6. When `useStream.status === 'done'`: `finalizeMessage(assistantId)`.
7. When `useStream.status === 'error'`: `setStreamingError(assistantId, useStream.error ?? 'Unknown error')`.
8. Input and quick-action buttons are disabled while `isStreaming` is true.

### No-provider state

If `provider` is null, `ChatPanel` shows the same "Enter an API key" prompt (with settings button) instead of the message thread.

### AIProvider interface change

Add `model: string` to `AIProvider`:

```ts
interface AIProvider {
  name: string
  model: string
  stream(systemPrompt: string, userContent: string): AsyncGenerator<string>
}
```

Each provider factory sets the model string:
- `createClaudeProvider` → `model: 'claude-sonnet-4-6'`
- `createOpenAIProvider` → `model: 'gpt-4o'`
- `createGeminiProvider` → `model: 'gemini-2.0-flash'`

---

## Feature 2: Highlights

### Highlight model

```ts
interface Highlight {
  id: string    // Date.now().toString()
  url: string   // article URL — used to filter on load
  quote: string // exact selected text
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple'
}
```

Stored in `chrome.storage.local` under key `'highlights'` as `Highlight[]`.

### useHighlights hook

```ts
function useHighlights(url: string): {
  addHighlight: (quote: string, color: HighlightColor) => void
  updateHighlight: (id: string, color: HighlightColor) => void
  removeHighlight: (id: string) => void
  highlights: Highlight[]
}
```

On mount: loads all highlights from storage, filters to `url`. Writes back to storage on every mutation (full array overwrite).

### Applying highlights to the DOM

Highlights are applied directly to the article DOM after React renders the `dangerouslySetInnerHTML` content. `ArticlePanel` uses a `useEffect` that re-runs when `highlights` changes. For each highlight:

1. Walk the article body's text nodes using `TreeWalker`.
2. Find the first text node containing `highlight.quote` (exact substring match).
3. Split the text node at the match boundaries using `splitText`.
4. Wrap the matched node with `document.createElement('span')`, set `className = 'hl-' + color` and `data-highlight-id = id`.
5. If the text is not found, skip silently.

This approach handles inline content (no cross-element splits) which covers the vast majority of article highlights.

### Selection flow (new highlight)

1. User releases mouse over `.article-body` (`mouseup` event).
2. `window.getSelection()` — if empty or collapsed, do nothing.
3. Compute popup position from `selection.getRangeAt(0).getBoundingClientRect()` — positioned above the selection, centered horizontally.
4. Render `<HighlightPopup>` (new-highlight mode): 5 color dots, no delete button.
5. User clicks a color → `addHighlight(selectedText, color)` → popup dismisses → highlight applied.
6. Clicking outside the popup (or starting a new selection) dismisses it without highlighting.

### Click flow (existing highlight)

1. Click event on `.article-body` — check `e.target.closest('[data-highlight-id]')`.
2. If found: show `<HighlightPopup>` (edit mode) at the span's `getBoundingClientRect()` — 5 color dots + red ✕ delete button.
3. Color dot click → `updateHighlight(id, newColor)` → DOM span class updated → popup dismisses.
4. ✕ click → `removeHighlight(id)` → span unwrapped (replace with text node) → popup dismisses.

### HighlightPopup component

```ts
interface HighlightPopupProps {
  position: { top: number; left: number }
  mode: 'new' | 'edit'
  onColorSelect: (color: HighlightColor) => void
  onDelete?: () => void
  onDismiss: () => void
}
```

Rendered into a portal (`document.body`) to escape any `overflow:hidden` containers. Dismissed on outside click via `mousedown` listener on document.

### CSS highlight classes

```css
.hl-yellow  { background: rgba(250, 204, 21, 0.35); border-radius: 2px; }
.hl-green   { background: rgba(74, 222, 128, 0.35); border-radius: 2px; }
.hl-blue    { background: rgba(96, 165, 250, 0.35); border-radius: 2px; }
.hl-pink    { background: rgba(244, 114, 182, 0.35); border-radius: 2px; }
.hl-purple  { background: rgba(167, 139, 250, 0.35); border-radius: 2px; }

/* Active/clicked state */
[data-highlight-id]:hover { filter: brightness(1.2); cursor: pointer; }
```

---

## Files Changed

### Deleted
- `src/workspace/components/SummarySection.tsx`
- `src/workspace/components/QuestionsSection.tsx`
- `src/workspace/components/InsightsSection.tsx`
- `src/workspace/components/QuestionCard.tsx`
- `src/workspace/components/WorkspacePanel.tsx`

### New
- `src/workspace/components/ChatPanel.tsx`
- `src/workspace/components/ChatHeader.tsx`
- `src/workspace/components/QuickActions.tsx`
- `src/workspace/components/MessageList.tsx`
- `src/workspace/components/ChatMessage.tsx`
- `src/workspace/components/ChatInput.tsx`
- `src/workspace/components/HighlightPopup.tsx`
- `src/workspace/hooks/useChatHistory.ts`
- `src/workspace/hooks/useHighlights.ts`

### Modified
- `src/workspace/providers/types.ts` — add `model: string` to `AIProvider`
- `src/workspace/providers/claude.ts` — add `model` field
- `src/workspace/providers/openai.ts` — add `model` field
- `src/workspace/providers/gemini.ts` — add `model` field
- `src/workspace/components/ArticlePanel.tsx` — add `onChatOpen: () => void` prop; render floating chat button (bottom-right); add `mouseup` selection handler and highlight DOM application
- `src/workspace/App.tsx` — `chatOpen` state, wire `ChatPanel`, remove old `WorkspacePanel`
- `src/workspace/styles.css` — chat panel styles, highlight color classes, popup styles

---

## Testing

**Unit tests (Vitest):**
- `useHighlights`: add, update, remove; storage read/write; filters by URL; handles missing quote gracefully.
- `useChatHistory`: addUserMessage, addAssistantMessage, updateMessage, finalize, error.

**E2E tests (Playwright):** existing tests continue to pass; no new E2E tests for v2 (highlight DOM manipulation is unit-testable).
