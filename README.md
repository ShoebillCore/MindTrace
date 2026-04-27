# MindTrace

A Chrome extension that transforms any article into an active reading workspace. Highlight text in five colors, open a side chat to ask questions, get summaries, and extract insights — all without leaving the page.

![MindTrace Logo](/public/icons/icon128.png)

---

## Features

- **Article workspace** — click the MindTrace button on any page to open a clean reading view powered by Mozilla Readability
- **AI chat panel** — floating button opens a full-height side chat with your chosen AI provider; quick-action buttons for Summary, Deep Insight, and Questions
- **Text highlighting** — select any text to highlight it in yellow, green, blue, pink, or purple; highlights persist per URL across sessions
- **Multi-provider support** — Claude (Anthropic), GPT-4o (OpenAI), and Gemini 2.0 Flash (Google)
- **Dark / light theme** — toggle in the workspace header

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension platform | Chrome Manifest V3 |
| UI framework | React 18 + TypeScript |
| Build tool | Vite + vite-plugin-web-extension |
| AI streaming | Native `fetch` SSE (no SDK dependency) |
| Persistence | `chrome.storage.local` |
| Article parsing | `@mozilla/readability` |
| Unit tests | Vitest + @testing-library/react |
| E2E tests | Playwright (headful Chrome) |

---

## Project Structure

```
src/
  content/          # Content script — captures page and opens workspace
  background/       # Service worker
  workspace/
    components/     # React components (ArticlePanel, ChatPanel, HighlightPopup, …)
    hooks/          # useStream, useChatHistory, useHighlights, useSettings, useTheme
    providers/      # Claude, OpenAI, Gemini streaming adapters
    styles.css
    App.tsx
public/
  icons/            # Extension icons (16, 48, 128 px)
tests/
  unit/             # Vitest unit tests
  e2e/              # Playwright end-to-end tests
```

---

## Getting Started

### Prerequisites

- Node.js 20+ (tested on v24)
- Chrome or Chromium

### Install dependencies

```bash
npm install
```

### Build the extension

```bash
npm run build
```

The built extension is output to `dist/`.

### Load into Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `dist/` folder

### Development (watch mode)

```bash
npm run dev
```

Vite rebuilds on every file save. After each rebuild, click the reload icon on the extension card in `chrome://extensions`.

---

## Configuration

MindTrace requires an API key for at least one AI provider. Open the workspace settings drawer (gear icon in the header) and paste your key:

| Provider | Where to get a key |
|---|---|
| Claude | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| Gemini | [aistudio.google.com](https://aistudio.google.com) |

Keys are stored locally in `chrome.storage.local` and never sent anywhere except the respective provider's API.

---

## Usage

1. Navigate to any article
2. Click the **MindTrace** extension icon in the Chrome toolbar
3. The article opens in a clean workspace tab
4. Click the **💬** floating button (bottom-right) to open the AI chat panel
5. Use quick actions (**Summary**, **Deep Insight**, **Questions**) or type a free-form question
6. Select any text in the article to highlight it; click an existing highlight to change its color or delete it

---

## Running Tests

### Unit tests

```bash
npm test
```

### Unit tests in watch mode

```bash
npm run test:watch
```

### End-to-end tests

E2E tests require a built extension and run in a real Chrome window.

```bash
npm run build
npm run test:e2e
```

> **Note:** Playwright runs Chrome in headful (non-headless) mode because extensions are not supported in headless Chrome.

---

## License

MIT
