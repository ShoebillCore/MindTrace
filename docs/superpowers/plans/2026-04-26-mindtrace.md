# MindTrace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension (MV3) that captures any webpage with Readability.js and opens an AI-powered reading workspace — Summary, Questions, and Deeper Insights — in a new tab, with multi-provider support (Claude, OpenAI, Gemini) and dark/light theming.

**Architecture:** Content script injects a floating button; on click it extracts the page with Readability.js, writes to `chrome.storage.session`, then opens `workspace.html` as a new tab. The workspace is a React SPA that reads the captured page and fires three independent streaming AI calls. Each AI provider implements a shared `AIProvider` interface with a `stream()` method returning an `AsyncGenerator<string>`.

**Tech Stack:** TypeScript, React 18, Vite 5, vite-plugin-web-extension, @mozilla/readability, Vitest + @testing-library/react (unit), Playwright (E2E), CSS custom properties (theming).

---

## File Map

| File | Responsibility |
|---|---|
| `manifest.json` | Extension manifest (MV3) |
| `vite.config.ts` | Vite + web-extension plugin config; also configures Vitest |
| `src/content/content.ts` | Inject button, run Readability, write to session storage, open workspace |
| `src/background/background.ts` | Minimal service worker (lifecycle only) |
| `src/workspace/workspace.html` | HTML entry for React SPA |
| `src/workspace/main.tsx` | React DOM root |
| `src/workspace/App.tsx` | Root component; owns theme + settings state; reads capturedPage |
| `src/workspace/styles.css` | CSS custom properties for dark/light theme; layout |
| `src/workspace/providers/types.ts` | `AIProvider` interface, `CapturedPage` type, `ProviderError`, `StreamStatus` |
| `src/workspace/providers/claude.ts` | Anthropic streaming adapter |
| `src/workspace/providers/openai.ts` | OpenAI streaming adapter |
| `src/workspace/providers/gemini.ts` | Gemini streaming adapter |
| `src/workspace/hooks/useStream.ts` | Drives AsyncGenerator → React state; `idle/loading/streaming/done/error` |
| `src/workspace/hooks/useSettings.ts` | Load/save API keys + selected provider from chrome.storage.local |
| `src/workspace/hooks/useTheme.ts` | Load/save theme from chrome.storage.local; sets data-theme on :root |
| `src/workspace/components/Header.tsx` | Logo, breadcrumb, provider dropdown, theme toggle, settings icon |
| `src/workspace/components/ArticlePanel.tsx` | Clean rendered article (left panel) |
| `src/workspace/components/WorkspacePanel.tsx` | Right panel; missing-key gate; composes three sections |
| `src/workspace/components/SummarySection.tsx` | Streaming summary card |
| `src/workspace/components/QuestionsSection.tsx` | Parses question list after stream done; renders QuestionCards |
| `src/workspace/components/QuestionCard.tsx` | Collapsible card; fires "go deeper" call on expand |
| `src/workspace/components/InsightsSection.tsx` | Streaming deeper insights card |
| `src/workspace/components/SettingsDrawer.tsx` | API key inputs per provider; saves to chrome.storage.local |
| `src/test-setup.ts` | Vitest global setup: chrome API mocks, @testing-library/jest-dom |
| `tests/unit/useStream.test.ts` | Unit tests for useStream hook |
| `tests/unit/claude.test.ts` | Unit tests for Claude provider adapter |
| `tests/unit/openai.test.ts` | Unit tests for OpenAI provider adapter |
| `tests/unit/gemini.test.ts` | Unit tests for Gemini provider adapter |
| `tests/unit/useSettings.test.ts` | Unit tests for useSettings hook |
| `tests/e2e/happy-path.test.ts` | E2E: extension loads, button appears, workspace opens |
| `tests/fixtures/article.html` | Static HTML article for E2E test |
| `playwright.config.ts` | Playwright config with Chrome extension loading |

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `manifest.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `src/test-setup.ts`
- Create: `src/content/content.ts` (placeholder)
- Create: `src/background/background.ts` (placeholder)
- Create: `src/workspace/workspace.html`
- Create: `src/workspace/main.tsx` (placeholder)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "mindtrace",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@mozilla/readability": "^0.5.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.43.1",
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^16.0.0",
    "@types/chrome": "^0.0.268",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^24.0.0",
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vite-plugin-web-extension": "^4.2.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "MindTrace",
  "version": "0.1.0",
  "description": "AI-powered reading workspace for any webpage",
  "permissions": ["storage", "tabs"],
  "host_permissions": ["<all_urls>"],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content.ts"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "src/background/background.ts",
    "type": "module"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import webExtension from 'vite-plugin-web-extension'

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: 'manifest.json',
      additionalInputs: ['src/workspace/workspace.html'],
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "types": ["chrome", "vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Create src/test-setup.ts**

```ts
import '@testing-library/jest-dom'

const mockStorage: Record<string, Record<string, unknown>> = {
  local: {},
  session: {},
}

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string | string[]) => {
        const ks = Array.isArray(keys) ? keys : [keys]
        return Promise.resolve(
          Object.fromEntries(ks.map((k) => [k, mockStorage.local[k]]).filter(([, v]) => v !== undefined))
        )
      }),
      set: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorage.local, data)
        return Promise.resolve()
      }),
    },
    session: {
      get: vi.fn((keys: string | string[]) => {
        const ks = Array.isArray(keys) ? keys : [keys]
        return Promise.resolve(
          Object.fromEntries(ks.map((k) => [k, mockStorage.session[k]]).filter(([, v]) => v !== undefined))
        )
      }),
      set: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorage.session, data)
        return Promise.resolve()
      }),
    },
  },
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
  },
  tabs: {
    create: vi.fn().mockResolvedValue({}),
  },
})

beforeEach(() => {
  mockStorage.local = {}
  mockStorage.session = {}
  vi.clearAllMocks()
})
```

- [ ] **Step 6: Create placeholder source files**

`src/content/content.ts`:
```ts
export {}
```

`src/background/background.ts`:
```ts
export {}
```

`src/workspace/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div>Loading...</div>
  </React.StrictMode>
)
```

`src/workspace/workspace.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MindTrace</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create placeholder icon files**

```bash
mkdir -p public/icons
# Create 1x1 purple PNG placeholders (replace before publishing)
python3 -c "
import struct, zlib
def png1x1(r,g,b):
    def chunk(name, data):
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', zlib.crc32(name+data)&0xffffffff)
    raw = b'\\x00' + bytes([r,g,b,255])
    return b'\\x89PNG\\r\\n\\x1a\\n' + chunk(b'IHDR', struct.pack('>IIBBBBB',1,1,8,2,0,0,0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
for size in [16,48,128]:
    open(f'public/icons/icon{size}.png','wb').write(png1x1(124,58,237))
"
```

- [ ] **Step 8: Install dependencies**

```bash
npm install
```

Expected: packages installed, `node_modules/` created.

- [ ] **Step 9: Verify build succeeds**

```bash
npm run build
```

Expected: `dist/` folder created, no errors. You will see output like `dist/content-scripts/content.js`, `dist/workspace.html`, etc.

- [ ] **Step 10: Commit scaffold**

```bash
git add package.json manifest.json vite.config.ts tsconfig.json src/ public/ && git commit -m "feat: scaffold project with Vite + React + MV3 extension setup"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/workspace/providers/types.ts`

- [ ] **Step 1: Create src/workspace/providers/types.ts**

```ts
export type StreamStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export type ProviderName = 'claude' | 'openai' | 'gemini'

export interface AIProvider {
  name: string
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
  content: string       // HTML from Readability
  textContent: string   // plain text from Readability
  excerpt: string
  wordCount: number
  isShort: boolean      // true when wordCount < 200
  url: string
}

export interface Settings {
  selectedProvider: ProviderName
  apiKeys: Record<ProviderName, string>
}
```

- [ ] **Step 2: Commit types**

```bash
git add src/workspace/providers/types.ts && git commit -m "feat: add shared types for AIProvider, CapturedPage, Settings"
```

---

## Task 3: useStream hook (TDD)

**Files:**
- Create: `src/workspace/hooks/useStream.ts`
- Create: `tests/unit/useStream.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/useStream.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useStream } from '../../src/workspace/hooks/useStream'
import type { AIProvider } from '../../src/workspace/providers/types'
import { ProviderError } from '../../src/workspace/providers/types'

function makeProvider(chunks: string[]): AIProvider {
  return {
    name: 'mock',
    async *stream() {
      for (const chunk of chunks) yield chunk
    },
  }
}

test('starts idle', () => {
  const { result } = renderHook(() => useStream(makeProvider(['hi'])))
  expect(result.current.status).toBe('idle')
  expect(result.current.text).toBe('')
  expect(result.current.error).toBeNull()
  expect(result.current.errorStatus).toBeUndefined()
})

test('streams chunks and reaches done', async () => {
  const provider = makeProvider(['Hello', ' world', '!'])
  const { result } = renderHook(() => useStream(provider))

  await act(async () => {
    await result.current.start('sys', 'user')
  })

  expect(result.current.text).toBe('Hello world!')
  expect(result.current.status).toBe('done')
})

test('sets status to loading then streaming', async () => {
  const statuses: string[] = []
  let resolveChunk!: () => void
  const blocker = new Promise<void>((res) => { resolveChunk = res })

  const provider: AIProvider = {
    name: 'slow',
    async *stream() {
      yield 'first'
      await blocker
      yield 'second'
    },
  }

  const { result } = renderHook(() => useStream(provider))

  act(() => { result.current.start('sys', 'user') })
  await waitFor(() => expect(result.current.status).toBe('streaming'))
  statuses.push(result.current.status)

  await act(async () => { resolveChunk() })
  await waitFor(() => expect(result.current.status).toBe('done'))
  statuses.push(result.current.status)

  expect(statuses).toEqual(['streaming', 'done'])
})

test('handles generic error', async () => {
  const provider: AIProvider = {
    name: 'error',
    async *stream() {
      throw new Error('network failure')
    },
  }
  const { result } = renderHook(() => useStream(provider))

  await act(async () => {
    await result.current.start('sys', 'user')
  })

  expect(result.current.status).toBe('error')
  expect(result.current.error).toBe('network failure')
  expect(result.current.errorStatus).toBeUndefined()
})

test('handles ProviderError and exposes status code', async () => {
  const provider: AIProvider = {
    name: 'ratelimit',
    async *stream() {
      throw new ProviderError('Too Many Requests', 429)
    },
  }
  const { result } = renderHook(() => useStream(provider))

  await act(async () => {
    await result.current.start('sys', 'user')
  })

  expect(result.current.status).toBe('error')
  expect(result.current.errorStatus).toBe(429)
})

test('preserves partial text on stream interruption', async () => {
  const provider: AIProvider = {
    name: 'partial',
    async *stream() {
      yield 'partial content'
      throw new Error('stream cut')
    },
  }
  const { result } = renderHook(() => useStream(provider))

  await act(async () => {
    await result.current.start('sys', 'user')
  })

  expect(result.current.text).toBe('partial content')
  expect(result.current.status).toBe('error')
})

test('does nothing when provider is null', async () => {
  const { result } = renderHook(() => useStream(null))
  await act(async () => {
    await result.current.start('sys', 'user')
  })
  expect(result.current.status).toBe('idle')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/unit/useStream.test.ts
```

Expected: FAIL — `Cannot find module '../../src/workspace/hooks/useStream'`

- [ ] **Step 3: Implement useStream**

Create `src/workspace/hooks/useStream.ts`:

```ts
import { useState, useCallback } from 'react'
import type { AIProvider, StreamStatus } from '../providers/types'
import { ProviderError } from '../providers/types'

interface StreamState {
  text: string
  status: StreamStatus
  error: string | null
  errorStatus: number | undefined
}

export function useStream(provider: AIProvider | null) {
  const [state, setState] = useState<StreamState>({
    text: '',
    status: 'idle',
    error: null,
    errorStatus: undefined,
  })

  const start = useCallback(
    async (systemPrompt: string, userContent: string) => {
      if (!provider) return
      setState({ text: '', status: 'loading', error: null, errorStatus: undefined })

      try {
        const gen = provider.stream(systemPrompt, userContent)
        let started = false

        for await (const chunk of gen) {
          if (!started) {
            started = true
            setState((s) => ({ ...s, status: 'streaming' }))
          }
          setState((s) => ({ ...s, text: s.text + chunk }))
        }

        setState((s) => ({ ...s, status: 'done' }))
      } catch (err) {
        if (err instanceof ProviderError) {
          setState((s) => ({
            ...s,
            status: 'error',
            error: err.message,
            errorStatus: err.status,
          }))
        } else {
          setState((s) => ({
            ...s,
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
            errorStatus: undefined,
          }))
        }
      }
    },
    [provider]
  )

  return { ...state, start }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- tests/unit/useStream.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/workspace/hooks/useStream.ts tests/unit/useStream.test.ts && git commit -m "feat: add useStream hook with streaming state management"
```

---

## Task 4: Claude provider adapter (TDD)

**Files:**
- Create: `src/workspace/providers/claude.ts`
- Create: `tests/unit/claude.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/claude.test.ts`:

```ts
import { createClaudeProvider } from '../../src/workspace/providers/claude'
import { ProviderError } from '../../src/workspace/providers/types'

function makeSseStream(lines: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line))
      }
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

function claudeEvent(text: string): string {
  return `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`
}

test('streams text from Claude SSE response', async () => {
  const lines = [claudeEvent('Hello'), claudeEvent(' world'), 'data: {"type":"message_stop"}\n\n']
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSseStream(lines)))

  const provider = createClaudeProvider('test-key')
  const chunks: string[] = []
  for await (const chunk of provider.stream('sys', 'user')) {
    chunks.push(chunk)
  }

  expect(chunks).toEqual(['Hello', ' world'])
})

test('sends correct headers and body to Anthropic API', async () => {
  const mockFetch = vi.fn().mockResolvedValue(makeSseStream([claudeEvent('ok')]))
  vi.stubGlobal('fetch', mockFetch)

  const provider = createClaudeProvider('my-key')
  for await (const _ of provider.stream('system prompt', 'user content')) { /* consume */ }

  const [url, init] = mockFetch.mock.calls[0]
  expect(url).toBe('https://api.anthropic.com/v1/messages')
  expect(init.headers['x-api-key']).toBe('my-key')
  expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true')
  const body = JSON.parse(init.body)
  expect(body.stream).toBe(true)
  expect(body.system).toBe('system prompt')
  expect(body.messages[0].content).toBe('user content')
})

test('throws ProviderError with status 429 on rate limit', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('rate limited', { status: 429 })))

  const provider = createClaudeProvider('key')
  await expect(async () => {
    for await (const _ of provider.stream('s', 'u')) { /* consume */ }
  }).rejects.toMatchObject({ status: 429 })
})

test('throws ProviderError with status 401 on invalid key', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 })))

  const provider = createClaudeProvider('bad-key')
  await expect(async () => {
    for await (const _ of provider.stream('s', 'u')) { /* consume */ }
  }).rejects.toBeInstanceOf(ProviderError)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/unit/claude.test.ts
```

Expected: FAIL — `Cannot find module '../../src/workspace/providers/claude'`

- [ ] **Step 3: Implement claude.ts**

Create `src/workspace/providers/claude.ts`:

```ts
import type { AIProvider } from './types'
import { ProviderError } from './types'

export function createClaudeProvider(apiKey: string): AIProvider {
  return {
    name: 'Claude',
    async *stream(systemPrompt: string, userContent: string) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new ProviderError(text, response.status)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          try {
            const event = JSON.parse(data)
            if (
              event.type === 'content_block_delta' &&
              event.delta?.type === 'text_delta'
            ) {
              yield event.delta.text as string
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    },
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- tests/unit/claude.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/workspace/providers/claude.ts tests/unit/claude.test.ts && git commit -m "feat: add Claude streaming provider adapter"
```

---

## Task 5: OpenAI provider adapter (TDD)

**Files:**
- Create: `src/workspace/providers/openai.ts`
- Create: `tests/unit/openai.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/openai.test.ts`:

```ts
import { createOpenAIProvider } from '../../src/workspace/providers/openai'
import { ProviderError } from '../../src/workspace/providers/types'

function makeSseStream(lines: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line))
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

function openaiEvent(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
}

test('streams text from OpenAI SSE response', async () => {
  const lines = [openaiEvent('Hi'), openaiEvent(' there'), 'data: [DONE]\n\n']
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSseStream(lines)))

  const provider = createOpenAIProvider('key')
  const chunks: string[] = []
  for await (const chunk of provider.stream('sys', 'user')) chunks.push(chunk)

  expect(chunks).toEqual(['Hi', ' there'])
})

test('sends correct headers and body to OpenAI API', async () => {
  const mockFetch = vi.fn().mockResolvedValue(makeSseStream([openaiEvent('ok'), 'data: [DONE]\n\n']))
  vi.stubGlobal('fetch', mockFetch)

  const provider = createOpenAIProvider('my-key')
  for await (const _ of provider.stream('sys', 'user')) { /* consume */ }

  const [url, init] = mockFetch.mock.calls[0]
  expect(url).toBe('https://api.openai.com/v1/chat/completions')
  expect(init.headers['Authorization']).toBe('Bearer my-key')
  const body = JSON.parse(init.body)
  expect(body.stream).toBe(true)
  expect(body.messages[0].role).toBe('system')
  expect(body.messages[1].role).toBe('user')
})

test('throws ProviderError on 429', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('rate limit', { status: 429 })))
  const provider = createOpenAIProvider('key')
  await expect(async () => {
    for await (const _ of provider.stream('s', 'u')) { /* consume */ }
  }).rejects.toMatchObject({ status: 429 })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/unit/openai.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement openai.ts**

Create `src/workspace/providers/openai.ts`:

```ts
import type { AIProvider } from './types'
import { ProviderError } from './types'

export function createOpenAIProvider(apiKey: string): AIProvider {
  return {
    name: 'OpenAI',
    async *stream(systemPrompt: string, userContent: string) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new ProviderError(text, response.status)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') return
          try {
            const event = JSON.parse(data)
            const content: string | undefined = event.choices?.[0]?.delta?.content
            if (content) yield content
          } catch {
            // skip malformed lines
          }
        }
      }
    },
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- tests/unit/openai.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/workspace/providers/openai.ts tests/unit/openai.test.ts && git commit -m "feat: add OpenAI streaming provider adapter"
```

---

## Task 6: Gemini provider adapter (TDD)

**Files:**
- Create: `src/workspace/providers/gemini.ts`
- Create: `tests/unit/gemini.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/gemini.test.ts`:

```ts
import { createGeminiProvider } from '../../src/workspace/providers/gemini'
import { ProviderError } from '../../src/workspace/providers/types'

function makeSseStream(lines: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line))
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

function geminiEvent(text: string): string {
  return `data: ${JSON.stringify({
    candidates: [{ content: { parts: [{ text }] } }],
  })}\n\n`
}

test('streams text from Gemini SSE response', async () => {
  const lines = [geminiEvent('Hey'), geminiEvent(' there')]
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSseStream(lines)))

  const provider = createGeminiProvider('key')
  const chunks: string[] = []
  for await (const chunk of provider.stream('sys', 'user')) chunks.push(chunk)

  expect(chunks).toEqual(['Hey', ' there'])
})

test('sends correct URL with API key and SSE alt', async () => {
  const mockFetch = vi.fn().mockResolvedValue(makeSseStream([geminiEvent('ok')]))
  vi.stubGlobal('fetch', mockFetch)

  const provider = createGeminiProvider('my-key')
  for await (const _ of provider.stream('sys', 'user')) { /* consume */ }

  const [url, init] = mockFetch.mock.calls[0]
  expect(url).toContain('key=my-key')
  expect(url).toContain('alt=sse')
  const body = JSON.parse(init.body)
  expect(body.system_instruction.parts[0].text).toBe('sys')
  expect(body.contents[0].parts[0].text).toBe('user')
})

test('throws ProviderError on 403', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('forbidden', { status: 403 })))
  const provider = createGeminiProvider('key')
  await expect(async () => {
    for await (const _ of provider.stream('s', 'u')) { /* consume */ }
  }).rejects.toMatchObject({ status: 403 })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/unit/gemini.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement gemini.ts**

Create `src/workspace/providers/gemini.ts`:

```ts
import type { AIProvider } from './types'
import { ProviderError } from './types'

export function createGeminiProvider(apiKey: string): AIProvider {
  return {
    name: 'Gemini',
    async *stream(systemPrompt: string, userContent: string) {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent` +
        `?key=${apiKey}&alt=sse`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new ProviderError(text, response.status)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data) continue
          try {
            const event = JSON.parse(data)
            const text: string | undefined =
              event.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) yield text
          } catch {
            // skip malformed lines
          }
        }
      }
    },
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- tests/unit/gemini.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/workspace/providers/gemini.ts tests/unit/gemini.test.ts && git commit -m "feat: add Gemini streaming provider adapter"
```

---

## Task 7: useSettings hook (TDD)

**Files:**
- Create: `src/workspace/hooks/useSettings.ts`
- Create: `tests/unit/useSettings.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/useSettings.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSettings } from '../../src/workspace/hooks/useSettings'

test('returns default settings when storage is empty', async () => {
  const { result } = renderHook(() => useSettings())
  await waitFor(() => expect(result.current.loaded).toBe(true))

  expect(result.current.settings.selectedProvider).toBe('claude')
  expect(result.current.settings.apiKeys.claude).toBe('')
  expect(result.current.settings.apiKeys.openai).toBe('')
  expect(result.current.settings.apiKeys.gemini).toBe('')
})

test('loads saved provider selection from storage', async () => {
  // Pre-populate storage via chrome mock
  await chrome.storage.local.set({ selectedProvider: 'openai' })

  const { result } = renderHook(() => useSettings())
  await waitFor(() => expect(result.current.loaded).toBe(true))

  expect(result.current.settings.selectedProvider).toBe('openai')
})

test('saves provider selection to storage', async () => {
  const { result } = renderHook(() => useSettings())
  await waitFor(() => expect(result.current.loaded).toBe(true))

  act(() => result.current.saveSettings({ selectedProvider: 'gemini' }))

  expect(result.current.settings.selectedProvider).toBe('gemini')
  expect(chrome.storage.local.set).toHaveBeenCalledWith(
    expect.objectContaining({ selectedProvider: 'gemini' })
  )
})

test('saves API key to storage', async () => {
  const { result } = renderHook(() => useSettings())
  await waitFor(() => expect(result.current.loaded).toBe(true))

  act(() =>
    result.current.saveSettings({
      apiKeys: { claude: 'sk-ant-123', openai: '', gemini: '' },
    })
  )

  expect(result.current.settings.apiKeys.claude).toBe('sk-ant-123')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/unit/useSettings.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement useSettings.ts**

Create `src/workspace/hooks/useSettings.ts`:

```ts
import { useState, useEffect } from 'react'
import type { Settings, ProviderName } from '../providers/types'

const DEFAULT_SETTINGS: Settings = {
  selectedProvider: 'claude',
  apiKeys: { claude: '', openai: '', gemini: '' },
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    chrome.storage.local
      .get(['selectedProvider', 'apiKeys'])
      .then((data) => {
        setSettings({
          selectedProvider:
            (data.selectedProvider as ProviderName) ??
            DEFAULT_SETTINGS.selectedProvider,
          apiKeys:
            (data.apiKeys as Record<ProviderName, string>) ??
            DEFAULT_SETTINGS.apiKeys,
        })
        setLoaded(true)
      })
  }, [])

  const saveSettings = (next: Partial<Settings>) => {
    const merged = { ...settings, ...next }
    setSettings(merged)
    chrome.storage.local.set({
      selectedProvider: merged.selectedProvider,
      apiKeys: merged.apiKeys,
    })
  }

  return { settings, saveSettings, loaded }
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- tests/unit/useSettings.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/workspace/hooks/useSettings.ts tests/unit/useSettings.test.ts && git commit -m "feat: add useSettings hook with chrome.storage.local persistence"
```

---

## Task 8: useTheme hook

**Files:**
- Create: `src/workspace/hooks/useTheme.ts`

- [ ] **Step 1: Implement useTheme.ts**

Create `src/workspace/hooks/useTheme.ts`:

```ts
import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    chrome.storage.local.get('theme').then((data) => {
      const saved = data.theme as Theme | undefined
      const initial: Theme = saved === 'light' ? 'light' : 'dark'
      setThemeState(initial)
      document.documentElement.setAttribute('data-theme', initial)
    })
  }, [])

  const setTheme = (next: Theme) => {
    setThemeState(next)
    document.documentElement.setAttribute('data-theme', next)
    chrome.storage.local.set({ theme: next })
  }

  return { theme, setTheme }
}
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/workspace/hooks/useTheme.ts && git commit -m "feat: add useTheme hook with data-theme persistence"
```

---

## Task 9: CSS theme system

**Files:**
- Create: `src/workspace/styles.css`

- [ ] **Step 1: Create styles.css**

Create `src/workspace/styles.css`:

```css
:root[data-theme='dark'] {
  --bg-primary: #0f0f1a;
  --bg-secondary: #12122a;
  --bg-card: #12122a;
  --bg-hover: #1a1a30;
  --border: #2a2a4a;
  --text-primary: #c8c8e8;
  --text-secondary: #9090b0;
  --text-muted: #5a5a7a;
  --accent-purple: #a78bfa;
  --accent-blue: #60a5fa;
  --accent-green: #34d399;
  --error: #f87171;
  --warning-bg: #422006;
  --warning-text: #fbbf24;
  --warning-border: #92400e;
}

:root[data-theme='light'] {
  --bg-primary: #fafafa;
  --bg-secondary: #ffffff;
  --bg-card: #ffffff;
  --bg-hover: #f4f4ff;
  --border: #e8e8f0;
  --text-primary: #1a1a2e;
  --text-secondary: #505070;
  --text-muted: #b0b0c0;
  --accent-purple: #7c3aed;
  --accent-blue: #2563eb;
  --accent-green: #059669;
  --error: #dc2626;
  --warning-bg: #fef3c7;
  --warning-text: #92400e;
  --warning-border: #fcd34d;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#root {
  height: 100%;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
}

/* ── Header ────────────────────────────────── */

.header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  padding: 0 20px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.header-logo {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--accent-purple);
  flex-shrink: 0;
}

.header-breadcrumb {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.provider-select {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 12px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  outline: none;
}

.theme-toggle {
  width: 34px;
  height: 20px;
  background: var(--border);
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  border: none;
  flex-shrink: 0;
}

.theme-toggle-knob {
  width: 14px;
  height: 14px;
  background: var(--accent-purple);
  border-radius: 50%;
  position: absolute;
  top: 3px;
  transition: left 0.2s;
}

.settings-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  padding: 2px;
}

.settings-btn:hover {
  color: var(--text-secondary);
}

/* ── Layout ────────────────────────────────── */

.workspace-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Article panel ─────────────────────────── */

.article-panel {
  width: 48%;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 36px 32px;
}

.article-title {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.35;
  margin-bottom: 10px;
}

.article-meta {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.article-body {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.article-body p {
  margin-bottom: 16px;
}

.article-body h1,
.article-body h2,
.article-body h3 {
  color: var(--text-primary);
  margin: 24px 0 12px;
}

.article-body img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

.article-body a {
  color: var(--accent-blue);
  text-decoration: none;
}

/* ── Workspace panel ───────────────────────── */

.workspace-panel {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.no-key-prompt {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.6;
}

.no-key-prompt button {
  margin-top: 12px;
  background: var(--accent-purple);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 13px;
  cursor: pointer;
}

.warning-banner {
  background: var(--warning-bg);
  color: var(--warning-text);
  border-bottom: 1px solid var(--warning-border);
  padding: 8px 20px;
  font-size: 12px;
  flex-shrink: 0;
}

/* ── Section cards ─────────────────────────── */

.section-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
}

.section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-weight: 600;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.section-label--purple { color: var(--accent-purple); }
.section-label--blue   { color: var(--accent-blue); }
.section-label--green  { color: var(--accent-green); }

.streaming-text {
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.skeleton-line {
  height: 10px;
  background: var(--border);
  border-radius: 4px;
  margin-bottom: 8px;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.error-state {
  font-size: 12px;
  color: var(--error);
  display: flex;
  align-items: center;
  gap: 8px;
}

.retry-btn {
  background: none;
  border: none;
  color: var(--accent-blue);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

/* ── Question cards ────────────────────────── */

.question-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.question-card {
  background: var(--bg-hover);
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  border: 1px solid transparent;
}

.question-card:hover {
  border-color: var(--border);
}

.question-card--expanded {
  border-color: var(--accent-blue);
  background: var(--bg-hover);
}

.question-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-primary);
  gap: 8px;
}

.question-card-chevron {
  color: var(--text-muted);
  font-size: 11px;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.question-card-chevron--open {
  transform: rotate(90deg);
}

.question-card-body {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* ── Settings drawer ───────────────────────── */

.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}

.settings-drawer {
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  width: 320px;
  height: 100vh;
  padding: 28px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.settings-field label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.settings-field input {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  color: var(--text-primary);
  outline: none;
}

.settings-field input:focus {
  border-color: var(--accent-purple);
}

.settings-close {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  align-self: flex-start;
}

/* ── Loading / empty states ────────────────── */

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: var(--text-muted);
}

.no-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 14px;
  color: var(--text-muted);
  text-align: center;
  padding: 32px;
  line-height: 1.6;
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/workspace/styles.css && git commit -m "feat: add CSS theme system with dark/light custom properties"
```

---

## Task 10: Content script

**Files:**
- Modify: `src/content/content.ts`

- [ ] **Step 1: Implement content.ts**

Replace `src/content/content.ts` with:

```ts
import { Readability } from '@mozilla/readability'
import type { CapturedPage } from '../workspace/providers/types'

function injectButton(): void {
  if (document.getElementById('mindtrace-btn')) return

  const btn = document.createElement('button')
  btn.id = 'mindtrace-btn'
  btn.title = 'Open MindTrace'
  btn.textContent = 'M'
  btn.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'right:24px',
    'width:44px',
    'height:44px',
    'border-radius:50%',
    'background:#7c3aed',
    'color:#fff',
    'font-weight:700',
    'font-size:18px',
    'border:none',
    'cursor:pointer',
    'z-index:2147483647',
    'box-shadow:0 2px 12px rgba(0,0,0,.35)',
    'font-family:sans-serif',
    'line-height:1',
  ].join(';')

  btn.addEventListener('click', handleClick)
  document.body.appendChild(btn)
}

function showToast(message: string): void {
  const existing = document.getElementById('mindtrace-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = 'mindtrace-toast'
  toast.textContent = message
  toast.style.cssText = [
    'position:fixed',
    'bottom:80px',
    'right:24px',
    'background:#1a1a2e',
    'color:#fff',
    'padding:10px 16px',
    'border-radius:8px',
    'font-size:13px',
    'font-family:sans-serif',
    'z-index:2147483647',
    'box-shadow:0 2px 12px rgba(0,0,0,.5)',
    'max-width:280px',
    'line-height:1.4',
  ].join(';')

  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3500)
}

async function handleClick(): Promise<void> {
  const clone = document.cloneNode(true) as Document
  const reader = new Readability(clone)
  const article = reader.parse()

  if (!article?.textContent?.trim()) {
    showToast("MindTrace couldn't extract readable content from this page.")
    return
  }

  const words = article.textContent.trim().split(/\s+/)
  const wordCount = words.length

  const captured: CapturedPage = {
    title: article.title || document.title,
    byline: article.byline || '',
    siteName: article.siteName || new URL(location.href).hostname,
    content: article.content || '',
    textContent: article.textContent,
    excerpt: article.excerpt || '',
    wordCount,
    isShort: wordCount < 200,
    url: location.href,
  }

  await chrome.storage.session.set({ capturedPage: captured })
  window.open(chrome.runtime.getURL('workspace.html'), '_blank')
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectButton)
} else {
  injectButton()
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: No errors, content script bundled in dist.

- [ ] **Step 3: Commit**

```bash
git add src/content/content.ts && git commit -m "feat: implement content script with Readability extraction and floating button"
```

---

## Task 11: Background service worker

**Files:**
- Modify: `src/background/background.ts`

- [ ] **Step 1: Implement background.ts**

Replace `src/background/background.ts` with:

```ts
chrome.runtime.onInstalled.addListener(() => {
  // Extension installed — no setup needed for v1
})
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/background/background.ts && git commit -m "feat: add minimal background service worker"
```

---

## Task 12: Workspace entry — App.tsx + main.tsx

**Files:**
- Modify: `src/workspace/main.tsx`
- Create: `src/workspace/App.tsx`

- [ ] **Step 1: Implement main.tsx**

Replace `src/workspace/main.tsx` with:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 2: Implement App.tsx**

Create `src/workspace/App.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useTheme } from './hooks/useTheme'
import { useSettings } from './hooks/useSettings'
import { createClaudeProvider } from './providers/claude'
import { createOpenAIProvider } from './providers/openai'
import { createGeminiProvider } from './providers/gemini'
import type { AIProvider, CapturedPage } from './providers/types'
import Header from './components/Header'
import ArticlePanel from './components/ArticlePanel'
import WorkspacePanel from './components/WorkspacePanel'
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

  useEffect(() => {
    chrome.storage.session.get('capturedPage').then((data) => {
      setPage((data.capturedPage as CapturedPage) ?? null)
      setPageLoaded(true)
    })
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
        <div className="warning-banner">
          Short content — AI responses may be limited.
        </div>
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
        <WorkspacePanel
          page={page}
          provider={provider}
          onSettingsOpen={() => setSettingsOpen(true)}
        />
      </main>
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

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/workspace/main.tsx src/workspace/App.tsx && git commit -m "feat: implement workspace entry and App root component"
```

---

## Task 13: Header component

**Files:**
- Create: `src/workspace/components/Header.tsx`

- [ ] **Step 1: Create Header.tsx**

```tsx
import type { CapturedPage, Settings, ProviderName } from '../providers/types'
import type { Theme } from '../hooks/useTheme'

interface HeaderProps {
  page: CapturedPage | null
  settings: Settings
  theme: Theme
  onThemeToggle: () => void
  onProviderChange: (p: ProviderName) => void
  onSettingsOpen: () => void
}

const PROVIDERS: { value: ProviderName; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
]

export default function Header({
  page,
  settings,
  theme,
  onThemeToggle,
  onProviderChange,
  onSettingsOpen,
}: HeaderProps) {
  const isDark = theme === 'dark'

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">MINDTRACE</span>
        {page && (
          <span className="header-breadcrumb">
            {page.siteName && `${page.siteName} · `}
            {page.title}
          </span>
        )}
      </div>

      <div className="header-right">
        <select
          className="provider-select"
          value={settings.selectedProvider}
          onChange={(e) => onProviderChange(e.target.value as ProviderName)}
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <button
          className="theme-toggle"
          onClick={onThemeToggle}
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          <div
            className="theme-toggle-knob"
            style={{ left: isDark ? '16px' : '3px' }}
          />
        </button>

        <button
          className="settings-btn"
          onClick={onSettingsOpen}
          title="Settings"
        >
          ⚙
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/workspace/components/Header.tsx && git commit -m "feat: add Header component with provider dropdown and theme toggle"
```

---

## Task 14: ArticlePanel component

**Files:**
- Create: `src/workspace/components/ArticlePanel.tsx`

- [ ] **Step 1: Create ArticlePanel.tsx**

```tsx
import type { CapturedPage } from '../providers/types'

interface ArticlePanelProps {
  page: CapturedPage | null
}

export default function ArticlePanel({ page }: ArticlePanelProps) {
  if (!page) {
    return (
      <div className="article-panel">
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          No article captured.
        </p>
      </div>
    )
  }

  return (
    <div className="article-panel">
      <h1 className="article-title">{page.title}</h1>
      {(page.byline || page.siteName) && (
        <p className="article-meta">
          {[page.byline, page.siteName].filter(Boolean).join(' · ')}
        </p>
      )}
      <div
        className="article-body"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/workspace/components/ArticlePanel.tsx && git commit -m "feat: add ArticlePanel for clean article rendering"
```

---

## Task 15: WorkspacePanel component

**Files:**
- Create: `src/workspace/components/WorkspacePanel.tsx`

- [ ] **Step 1: Create WorkspacePanel.tsx**

The panel composes the three sections and gates on API key presence.

```tsx
import type { AIProvider, CapturedPage } from '../providers/types'
import SummarySection from './SummarySection'
import QuestionsSection from './QuestionsSection'
import InsightsSection from './InsightsSection'

interface WorkspacePanelProps {
  page: CapturedPage | null
  provider: AIProvider | null
  onSettingsOpen: () => void
}

export default function WorkspacePanel({
  page,
  provider,
  onSettingsOpen,
}: WorkspacePanelProps) {
  if (!page) {
    return (
      <div className="workspace-panel">
        <div className="no-key-prompt">
          Navigate to an article and click the MindTrace button to get started.
        </div>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="workspace-panel">
        <div className="no-key-prompt">
          <p>Enter an API key to activate the AI workspace.</p>
          <button onClick={onSettingsOpen}>Open Settings</button>
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-panel">
      <SummarySection page={page} provider={provider} />
      <QuestionsSection page={page} provider={provider} />
      <InsightsSection page={page} provider={provider} />
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/workspace/components/WorkspacePanel.tsx && git commit -m "feat: add WorkspacePanel with API key gate"
```

---

## Task 16: SummarySection component

**Files:**
- Create: `src/workspace/components/SummarySection.tsx`

- [ ] **Step 1: Create SummarySection.tsx**

```tsx
import { useEffect } from 'react'
import { useStream } from '../hooks/useStream'
import type { AIProvider, CapturedPage } from '../providers/types'

const SYSTEM_PROMPT =
  'You are a precise reading assistant. Summarize the article in 3-5 sentences. ' +
  'Focus on the core argument, key evidence, and main conclusion. Be concise.'

interface SummarySectionProps {
  page: CapturedPage
  provider: AIProvider
}

function errorMessage(errorStatus?: number): string {
  if (errorStatus === 429) return 'Rate limited — wait a moment and retry.'
  if (errorStatus === 401 || errorStatus === 403) return 'Invalid API key — check your settings.'
  return 'Connection lost — retry?'
}

export default function SummarySection({ page, provider }: SummarySectionProps) {
  const { text, status, error, errorStatus, start } = useStream(provider)

  useEffect(() => {
    start(SYSTEM_PROMPT, page.textContent.slice(0, 8000))
  }, [page.url, provider.name]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="section-card">
      <div className="section-label section-label--purple">◈ Summary</div>

      {(status === 'loading') && (
        <>
          <div className="skeleton-line" style={{ width: '90%' }} />
          <div className="skeleton-line" style={{ width: '75%' }} />
          <div className="skeleton-line" style={{ width: '85%' }} />
        </>
      )}

      {(status === 'streaming' || status === 'done') && (
        <p className="streaming-text">{text}</p>
      )}

      {status === 'error' && (
        <div className="error-state">
          <span>{error ? errorMessage(errorStatus) : 'Something went wrong.'}</span>
          <button className="retry-btn" onClick={() => start(SYSTEM_PROMPT, page.textContent.slice(0, 8000))}>
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/workspace/components/SummarySection.tsx && git commit -m "feat: add SummarySection with streaming AI summary"
```

---

## Task 17: QuestionsSection + QuestionCard

**Files:**
- Create: `src/workspace/components/QuestionsSection.tsx`
- Create: `src/workspace/components/QuestionCard.tsx`

- [ ] **Step 1: Create QuestionCard.tsx**

The card fires a "go deeper" call when expanded.

```tsx
import { useState } from 'react'
import { useStream } from '../hooks/useStream'
import type { AIProvider } from '../providers/types'

const DEEPER_SYSTEM =
  'You are a thoughtful reading companion. The user is reading an article and has a question. ' +
  'Provide a focused, insightful 3-4 sentence answer grounded in the article content. ' +
  'You may expand beyond the article when relevant, but stay concise.'

interface QuestionCardProps {
  question: string
  articleText: string
  provider: AIProvider
}

function errorMessage(errorStatus?: number): string {
  if (errorStatus === 429) return 'Rate limited — wait a moment and retry.'
  if (errorStatus === 401 || errorStatus === 403) return 'Invalid API key — check your settings.'
  return 'Connection lost — retry?'
}

export default function QuestionCard({
  question,
  articleText,
  provider,
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { text, status, error, errorStatus, start } = useStream(provider)

  function toggle() {
    const next = !expanded
    setExpanded(next)
    if (next && status === 'idle') {
      const userContent = `Article:\n${articleText.slice(0, 6000)}\n\nQuestion: ${question}`
      start(DEEPER_SYSTEM, userContent)
    }
  }

  return (
    <div
      className={`question-card ${expanded ? 'question-card--expanded' : ''}`}
      onClick={toggle}
    >
      <div className="question-card-header">
        <span>{question}</span>
        <span className={`question-card-chevron ${expanded ? 'question-card-chevron--open' : ''}`}>
          ▶
        </span>
      </div>

      {expanded && (
        <div className="question-card-body">
          {status === 'loading' && (
            <>
              <div className="skeleton-line" style={{ width: '88%' }} />
              <div className="skeleton-line" style={{ width: '70%' }} />
            </>
          )}
          {(status === 'streaming' || status === 'done') && (
            <p className="streaming-text">{text}</p>
          )}
          {status === 'error' && (
            <div className="error-state" onClick={(e) => e.stopPropagation()}>
              <span>{errorMessage(errorStatus)}</span>
              <button
                className="retry-btn"
                onClick={() => {
                  const userContent = `Article:\n${articleText.slice(0, 6000)}\n\nQuestion: ${question}`
                  start(DEEPER_SYSTEM, userContent)
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create QuestionsSection.tsx**

The section streams the full questions list, then parses it when done.

```tsx
import { useEffect } from 'react'
import { useStream } from '../hooks/useStream'
import type { AIProvider, CapturedPage } from '../providers/types'
import QuestionCard from './QuestionCard'

const SYSTEM_PROMPT =
  'You are a curious reading companion. Generate exactly 4 thought-provoking questions ' +
  'that a careful reader should consider about this article. Return one question per line. ' +
  'No numbering, no bullet points, no other text — just 4 lines, one question each.'

interface QuestionsSectionProps {
  page: CapturedPage
  provider: AIProvider
}

function errorMessage(errorStatus?: number): string {
  if (errorStatus === 429) return 'Rate limited — wait a moment and retry.'
  if (errorStatus === 401 || errorStatus === 403) return 'Invalid API key — check your settings.'
  return 'Connection lost — retry?'
}

export default function QuestionsSection({ page, provider }: QuestionsSectionProps) {
  const { text, status, error, errorStatus, start } = useStream(provider)

  useEffect(() => {
    start(SYSTEM_PROMPT, page.textContent.slice(0, 8000))
  }, [page.url, provider.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const questions =
    status === 'done'
      ? text
          .split('\n')
          .map((q) => q.trim())
          .filter((q) => q.length > 0)
      : []

  return (
    <div className="section-card">
      <div className="section-label section-label--blue">? Questions to Consider</div>

      {status === 'loading' && (
        <>
          <div className="skeleton-line" style={{ width: '80%' }} />
          <div className="skeleton-line" style={{ width: '72%' }} />
          <div className="skeleton-line" style={{ width: '88%' }} />
          <div className="skeleton-line" style={{ width: '65%' }} />
        </>
      )}

      {status === 'streaming' && (
        <p className="streaming-text" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Generating questions…
        </p>
      )}

      {status === 'done' && (
        <div className="question-list">
          {questions.map((q, i) => (
            <QuestionCard
              key={i}
              question={q}
              articleText={page.textContent}
              provider={provider}
            />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="error-state">
          <span>{error ? errorMessage(errorStatus) : 'Something went wrong.'}</span>
          <button
            className="retry-btn"
            onClick={() => start(SYSTEM_PROMPT, page.textContent.slice(0, 8000))}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/workspace/components/QuestionsSection.tsx src/workspace/components/QuestionCard.tsx && git commit -m "feat: add QuestionsSection and QuestionCard with lazy go-deeper expansion"
```

---

## Task 18: InsightsSection component

**Files:**
- Create: `src/workspace/components/InsightsSection.tsx`

- [ ] **Step 1: Create InsightsSection.tsx**

```tsx
import { useEffect } from 'react'
import { useStream } from '../hooks/useStream'
import type { AIProvider, CapturedPage } from '../providers/types'

const SYSTEM_PROMPT =
  'You are an expert reading companion. Based on the article, provide 3-5 sentences of deeper context: ' +
  'related concepts, relevant prior work, broader implications, or intellectual connections the article touches on. ' +
  'Be specific and intellectually substantive.'

interface InsightsSectionProps {
  page: CapturedPage
  provider: AIProvider
}

function errorMessage(errorStatus?: number): string {
  if (errorStatus === 429) return 'Rate limited — wait a moment and retry.'
  if (errorStatus === 401 || errorStatus === 403) return 'Invalid API key — check your settings.'
  return 'Connection lost — retry?'
}

export default function InsightsSection({ page, provider }: InsightsSectionProps) {
  const { text, status, error, errorStatus, start } = useStream(provider)

  useEffect(() => {
    start(SYSTEM_PROMPT, page.textContent.slice(0, 8000))
  }, [page.url, provider.name]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="section-card">
      <div className="section-label section-label--green">◆ Deeper Insights</div>

      {status === 'loading' && (
        <>
          <div className="skeleton-line" style={{ width: '93%' }} />
          <div className="skeleton-line" style={{ width: '80%' }} />
          <div className="skeleton-line" style={{ width: '87%' }} />
        </>
      )}

      {(status === 'streaming' || status === 'done') && (
        <p className="streaming-text">{text}</p>
      )}

      {status === 'error' && (
        <div className="error-state">
          <span>{error ? errorMessage(errorStatus) : 'Something went wrong.'}</span>
          <button
            className="retry-btn"
            onClick={() => start(SYSTEM_PROMPT, page.textContent.slice(0, 8000))}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/workspace/components/InsightsSection.tsx && git commit -m "feat: add InsightsSection with streaming deeper context"
```

---

## Task 19: SettingsDrawer component

**Files:**
- Create: `src/workspace/components/SettingsDrawer.tsx`

- [ ] **Step 1: Create SettingsDrawer.tsx**

```tsx
import { useState } from 'react'
import type { Settings, ProviderName } from '../providers/types'

interface SettingsDrawerProps {
  settings: Settings
  onSave: (apiKeys: Record<ProviderName, string>) => void
  onClose: () => void
}

const PROVIDERS: { value: ProviderName; label: string; placeholder: string }[] = [
  { value: 'claude', label: 'Claude (Anthropic)', placeholder: 'sk-ant-…' },
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-…' },
  { value: 'gemini', label: 'Gemini (Google AI)', placeholder: 'AI…' },
]

export default function SettingsDrawer({
  settings,
  onSave,
  onClose,
}: SettingsDrawerProps) {
  const [keys, setKeys] = useState<Record<ProviderName, string>>({
    ...settings.apiKeys,
  })

  function save() {
    onSave(keys)
    onClose()
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <span className="settings-title">Settings</span>

        {PROVIDERS.map((p) => (
          <div className="settings-field" key={p.value}>
            <label htmlFor={`key-${p.value}`}>{p.label} API Key</label>
            <input
              id={`key-${p.value}`}
              type="password"
              placeholder={p.placeholder}
              value={keys[p.value]}
              onChange={(e) =>
                setKeys((prev) => ({ ...prev, [p.value]: e.target.value }))
              }
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="settings-close" onClick={save}>
            Save &amp; Close
          </button>
          <button className="settings-close" onClick={onClose}>
            Cancel
          </button>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          API keys are stored locally in your browser and never sent anywhere
          except directly to the respective AI provider.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify full build passes**

```bash
npm run build
```

Expected: Clean build. All files bundled.

- [ ] **Step 3: Run all unit tests**

```bash
npm test
```

Expected: All unit tests PASS (useStream, claude, openai, gemini, useSettings).

- [ ] **Step 4: Commit**

```bash
git add src/workspace/components/SettingsDrawer.tsx && git commit -m "feat: add SettingsDrawer for API key management"
```

---

## Task 20: E2E test

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/fixtures/article.html`
- Create: `tests/e2e/happy-path.test.ts`

- [ ] **Step 1: Install Playwright browsers**

```bash
npx playwright install chromium
```

Expected: Chromium downloaded.

- [ ] **Step 2: Create playwright.config.ts**

```ts
import { defineConfig } from '@playwright/test'
import path from 'path'

const extensionPath = path.resolve(__dirname, 'dist')

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    headless: false,
  },
  projects: [
    {
      name: 'chrome-extension',
      use: {
        launchOptions: {
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
          ],
        },
      },
    },
  ],
})
```

- [ ] **Step 3: Create tests/fixtures/article.html**

Create a static article with enough text to exceed the 200-word threshold:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>The Science of Deep Work</title>
</head>
<body>
  <article>
    <h1>The Science of Deep Work: Why Focus Is the New Currency</h1>
    <p>By Dr. Jane Smith · MindTrace Test Journal</p>
    <p>
      In an era of constant notifications and open-plan offices, the ability to focus deeply on
      cognitively demanding tasks has become increasingly rare — and increasingly valuable. Cognitive
      scientist Cal Newport coined the term "deep work" to describe professional activity performed in
      a state of distraction-free concentration that pushes cognitive capabilities to their limit.
    </p>
    <p>
      Research from the University of California, Irvine found that it takes an average of 23 minutes
      and 15 seconds to return to a task after an interruption. In knowledge work, where the output
      depends on the quality of thinking rather than the quantity of hours, this fragmentation is
      catastrophic. Each context switch carries a cognitive tax that accumulates across the workday.
    </p>
    <p>
      Neuroscience supports this. The prefrontal cortex, which governs executive function and
      deliberate reasoning, operates best under conditions of sustained attention. Shallow tasks —
      email, meetings, administrative work — activate different neural circuits that do not build the
      myelin sheaths associated with skill development. Deep work, by contrast, builds lasting
      cognitive infrastructure.
    </p>
    <p>
      The economic implications are significant. As automation handles routine cognitive tasks,
      the comparative advantage of human workers increasingly lies in their capacity for complex
      judgment, creative synthesis, and novel problem-solving — all of which require extended periods
      of undisturbed focus. Organizations that protect their employees' capacity for deep work will
      increasingly outperform those that do not.
    </p>
    <p>
      Practical strategies for cultivating deep work include time-blocking, digital minimalism, and
      deliberate scheduling of cognitively demanding work during peak energy hours. The goal is not
      merely efficiency but the development of a rare skill that compounds over time, producing work
      of exceptional quality that is difficult to replicate.
    </p>
  </article>
</body>
</html>
```

- [ ] **Step 4: Create tests/e2e/happy-path.test.ts**

```ts
import { test, expect, chromium } from '@playwright/test'
import path from 'path'

const EXTENSION_PATH = path.resolve(__dirname, '../../dist')
const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/article.html')

test('MindTrace button appears and workspace opens with all three sections', async () => {
  // Launch Chrome with the extension loaded
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  })

  const page = await context.newPage()
  await page.goto(`file://${FIXTURE_PATH}`)

  // MindTrace button should be injected into the page
  const btn = page.locator('#mindtrace-btn')
  await expect(btn).toBeVisible({ timeout: 5000 })

  // Click the button — workspace should open as a new tab
  const [workspacePage] = await Promise.all([
    context.waitForEvent('page'),
    btn.click(),
  ])

  await workspacePage.waitForLoadState('domcontentloaded')

  // Workspace URL should be the extension page
  expect(workspacePage.url()).toContain('workspace.html')

  // Article panel should be visible
  await expect(workspacePage.locator('.article-panel')).toBeVisible()

  // All three AI section cards should be present
  await expect(workspacePage.locator('.section-card').nth(0)).toBeVisible()
  await expect(workspacePage.locator('.section-card').nth(1)).toBeVisible()
  await expect(workspacePage.locator('.section-card').nth(2)).toBeVisible()

  // Section labels should show correct content
  await expect(workspacePage.locator('.section-label').nth(0)).toContainText('Summary')
  await expect(workspacePage.locator('.section-label').nth(1)).toContainText('Questions')
  await expect(workspacePage.locator('.section-label').nth(2)).toContainText('Insights')

  await context.close()
})

test('shows no-key prompt when API key is not set', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  })

  const page = await context.newPage()
  await page.goto(`file://${FIXTURE_PATH}`)

  const btn = page.locator('#mindtrace-btn')
  await expect(btn).toBeVisible()

  const [workspacePage] = await Promise.all([
    context.waitForEvent('page'),
    btn.click(),
  ])

  await workspacePage.waitForLoadState('domcontentloaded')

  // With no API key set, workspace shows the settings prompt
  await expect(workspacePage.locator('.no-key-prompt')).toBeVisible()
  await expect(workspacePage.locator('.no-key-prompt')).toContainText('API key')

  await context.close()
})
```

- [ ] **Step 5: Build and run E2E tests**

```bash
npm run build && npm run test:e2e
```

Expected:
- `MindTrace button appears…` → PASS
- `shows no-key prompt…` → PASS

Note: The E2E tests do not call the AI APIs (no key is set by default). They verify structural correctness only. To test streaming AI responses end-to-end, set an API key via the Settings drawer during a manual session.

- [ ] **Step 6: Run all tests to confirm nothing is broken**

```bash
npm test
```

Expected: All 17+ unit tests PASS.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts tests/ && git commit -m "feat: add E2E tests with Playwright for extension happy path"
```

---

## Final verification

- [ ] **Load the extension manually in Chrome**

  1. Run `npm run build`
  2. Open `chrome://extensions`
  3. Enable Developer mode
  4. Click "Load unpacked" → select `dist/`
  5. Navigate to any article (e.g., a Wikipedia page)
  6. Verify the purple MindTrace button appears bottom-right
  7. Click it → verify workspace opens in new tab
  8. Open Settings (⚙), enter a Claude/OpenAI/Gemini API key
  9. Reload the workspace tab
  10. Verify Summary, Questions, and Insights all stream and populate
  11. Click a question to expand and verify "go deeper" response streams
  12. Toggle the theme and verify dark/light mode switches correctly

- [ ] **Final commit**

```bash
git add -A && git commit -m "chore: complete MindTrace v1 implementation"
```
