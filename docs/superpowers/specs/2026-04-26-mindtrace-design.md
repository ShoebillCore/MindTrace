# MindTrace — Design Spec
*2026-04-26*

## Overview

MindTrace is a Chrome extension that captures the main content of any webpage and opens an AI-powered reading workspace in a new tab. Instead of passively consuming information, users get a structured, interactive layer on top of what they're reading — a summary, thoughtful questions to consider, and deeper insights, all driven by AI.

---

## Core User Flow

1. User is reading any article or webpage.
2. User clicks the MindTrace floating button injected into the page.
3. The extension extracts clean article content using Readability.js.
4. Extracted content is stored in `chrome.storage.session`.
5. A new tab opens with the MindTrace workspace.
6. The workspace renders the clean article on the left and the AI workspace on the right.
7. Three AI sections load in parallel and stream their responses independently: Summary, Questions, Deeper Insights.
8. User can click any question card to expand a "go deeper" answer (fires a second AI call on demand).
9. Closing the tab ends the session — no persistence in v1.

---

## Architecture

**Extension type:** Manifest V3 Chrome Extension

**Components:**

| Component | Role |
|---|---|
| Content Script (`content.ts`) | Injected into every page. Adds floating MindTrace button. On click: runs Readability.js, writes result to `chrome.storage.session`, opens `workspace.html` as new tab. |
| Service Worker (`background.ts`) | Minimal. Handles extension lifecycle events only. |
| Workspace (`workspace.html` + React SPA) | Opens as a new tab at `chrome-extension://…/workspace.html` (not a new tab page override). Reads captured page from `chrome.storage.session` on load. Renders split view: article on left, AI workspace on right. |
| AI Provider Adapters | One adapter per provider (Claude, OpenAI, Gemini). Each implements a shared `AIProvider` interface with `stream(prompt, content): AsyncGenerator<string>`. |
| Settings (chrome.storage.local) | API keys per provider, selected provider, theme preference. No backend, no account. |

**Data flow:**
```
Page → [content script] → Readability.js → chrome.storage.session
                                                    ↓
                                          workspace.html (new tab)
                                                    ↓
                                          AIProvider.stream() → API
                                                    ↓
                                          Streaming response → React UI
```

---

## Workspace UI

**Layout:** Full-width new tab. Split 48/52 — article on left, AI workspace on right.

**Header:** MindTrace logo · site name · article title · provider dropdown · theme toggle · settings icon.

**Article Panel (left):**
- Clean rendered article: title, byline, date, body text (Readability output).
- Scrollable independently of the right panel.

**Workspace Panel (right):**
Three sections, each loads and streams independently:

1. **Summary** — concise AI-generated summary of the article.
2. **Questions to Consider** — 3–5 AI-generated questions rendered as collapsible cards. Clicking a card expands it; a "Go deeper" action fires a second AI call to generate an expanded answer for that specific question. Questions not yet expanded show a collapsed state.
3. **Deeper Insights** — contextual insights: related concepts, relevant prior work, broader implications the article touches on.

**Theme:** Dark and light mode. Toggle in header, persisted to `chrome.storage.local`. Implemented via CSS custom properties on `:root`.

---

## AI Provider Support

User selects their provider in the header dropdown. API key per provider is stored in `chrome.storage.local` (never leaves the browser except in direct API calls).

Supported providers:
- **Claude** (Anthropic API — streaming)
- **OpenAI** (GPT-4 — streaming)
- **Gemini** (Google AI — streaming)

All three implement the same `AIProvider` interface:
```ts
interface AIProvider {
  name: string;
  stream(systemPrompt: string, userContent: string): AsyncGenerator<string>;
}
```

---

## File Structure

```
MindTrace/
├── manifest.json
├── src/
│   ├── content/
│   │   └── content.ts
│   ├── background/
│   │   └── background.ts
│   ├── workspace/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── ArticlePanel.tsx
│   │   │   ├── WorkspacePanel.tsx
│   │   │   ├── SummarySection.tsx
│   │   │   ├── QuestionsSection.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── InsightsSection.tsx
│   │   │   └── SettingsDrawer.tsx
│   │   ├── providers/
│   │   │   ├── types.ts
│   │   │   ├── claude.ts
│   │   │   ├── openai.ts
│   │   │   └── gemini.ts
│   │   └── hooks/
│   │       ├── useTheme.ts
│   │       ├── useSettings.ts
│   │       └── useStream.ts
│   └── workspace.html
├── public/icons/
├── vite.config.ts
└── package.json
```

**Key design decisions:**
- `App.tsx` owns theme and selected provider — passed as props, no external state library needed.
- Each AI section fires its own independent API call on mount — parallel loading, independent streaming.
- `QuestionCard` fires its "go deeper" call only on user click — lazy, not pre-generated.
- `useStream` is a single reusable hook: takes an `AIProvider` + prompt, manages `idle | loading | streaming | done | error` state.
- Each section component owns its own prompt template — `SummarySection`, `QuestionsSection`, and `InsightsSection` each construct the system prompt and user message they pass to `useStream`. No shared prompt file.

---

## Error Handling

**Content extraction failures:**
- Readability returns nothing (web app, login page, JS-heavy SPA): inline toast *"MindTrace couldn't extract readable content from this page."* No workspace tab is opened.
- Very short content (under ~200 words): workspace opens with a warning banner *"Short content — AI responses may be limited."*

**API failures:**
- Missing API key: workspace shows a prompt to open Settings before any section loads.
- Network error / non-2xx: each section independently shows an inline error with a "Retry" button — failure in one section does not block others.
- Stream interrupted mid-response: streamed content so far is preserved, *"Connection lost — retry?"* link appears below.
- Rate limit (429): *"Rate limited — wait a moment and retry."*
- Invalid API key (401/403): *"Invalid API key — check your settings."*

---

## Testing

- **Unit tests (Vitest):** Each AI provider adapter — mock fetch, assert correct request shape and streaming output. `useStream` hook — simulate generator states.
- **E2E (Playwright + Chrome extension support):** Happy path — load extension, navigate to static HTML fixture article, click button, assert workspace opens with all three sections populated.
- No mocking of DOM or Readability in E2E — run against a real static HTML fixture page.

---

## Out of Scope (v1)

- Page persistence / history of clipped pages
- Freeform chat with the AI
- Highlight-based inline interaction
- Mobile / other browsers
- User accounts or cloud sync
