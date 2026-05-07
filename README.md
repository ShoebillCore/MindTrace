# MindTraceReader

An AI-powered reading workspace for Chrome. Click the toolbar icon on any webpage to instantly extract and render the main 
article content in a clean, distraction-free reading view. Highlight passages in five colors, attach notes, and chat with  
an AI about what you're reading — powered entirely by your own API key, with no data ever leaving your browser.            
MindTraceReader also converts any article to Markdown with one click, letting you download a formatted .md file for your   
notes or knowledge base. An outline panel automatically generated from the article's headings lets you jump to any section 
instantly.  

![MindTraceReader Logo](/public/icons/icon128.png)

---

## Features

### Article Workspace
Click the MindTraceReader icon in the Chrome toolbar on any page. The extension extracts the main article content (powered by [Defuddle](https://github.com/kepano/defuddle)), strips away ads and navigation, and opens it in a focused reading tab.

### Text Highlighting
Select any passage to highlight it. A color picker flashes above the selection — choose from five colors:

| Color | Use |
|---|---|
| 🟡 Yellow | General interest |
| 🟢 Green | Key facts |
| 🔵 Blue | Definitions / concepts |
| 🩷 Pink | Questions to revisit |
| 🟣 Purple | Strong agreement / disagreement |

Click any existing highlight to open a popup where you can change its color, add a note, or delete it. Highlights and notes are saved per URL in `chrome.storage.local` and persist across sessions.

### AI Chat Panel
Open the chat panel (💬 button, top-right of the workspace) to talk to an AI about what you're reading.

**Quick actions** — one-click prompts pre-loaded with the full article context:
- **Summary** — concise overview of the article
- **Deep Insight** — themes, implications, and analysis
- **Questions** — thought-provoking questions to deepen understanding

**Free-form chat** — ask anything about the article; the AI always has the full text in context.

Responses stream in real time. All requests go directly from your browser to the provider's API — nothing passes through any third-party server.

### Reader Settings
Adjust the reading experience from the header:

| Control | Range |
|---|---|
| Font size | 12 – 24 px (±1 px steps) |
| Content width | 30 – 90 % (±5 % steps) |
| Mode | Light / Dark |

### Themes
Eight carefully chosen color schemes, each available in both light and dark mode:

| Theme | Inspired by |
|---|---|
| **Default** | Clean warm neutrals |
| **GitHub** | GitHub's editor palette |
| **Catppuccin** | Catppuccin Mocha |
| **Rosé Pine** | Rosé Pine |
| **Flexoki** | Flexoki ink tones |
| **Ayu** | Ayu Mirage |
| **Gruvbox** | Gruvbox dark |
| **Penumbra** | Penumbra dark |

Preview and apply themes live from the Settings page — the article updates instantly behind the modal.

### Settings Page
A structured settings panel (gear icon in the header) with four sections:

- **Highlighter** — pick a default highlight color pre-selected whenever you highlight new text
- **Reader** — font size, content width, mode, and theme
- **Interpreter** — choose your AI provider and enter your API key
- **General** — download folder for exported content

---

## Supported AI Providers

| Provider | Default model | Get an API key |
|---|---|---|
| **Claude** (Anthropic) | `claude-sonnet-4-6` | [console.anthropic.com](https://console.anthropic.com) |
| **OpenAI** | `gpt-4o` | [platform.openai.com](https://platform.openai.com) |
| **Google Gemini** | `gemini-2.0-flash` | [aistudio.google.com](https://aistudio.google.com) |
| **Deepseek** | `deepseek-chat` | [platform.deepseek.com](https://platform.deepseek.com) |

Keys are stored locally in `chrome.storage.local` and sent only to the respective provider. You can configure multiple providers and switch between them at any time.

---

## Privacy

- No account required
- No data collected or sent to any MindTraceReader server
- API keys never leave your browser except in requests to your chosen AI provider
- Highlights and notes are stored locally in `chrome.storage.local`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension platform | Chrome Manifest V3 |
| UI framework | React 18 + TypeScript |
| Build tool | Vite + vite-plugin-web-extension |
| Article parsing | Defuddle |
| AI streaming | Native `fetch` SSE (no SDK dependency) |
| Persistence | `chrome.storage.local` |
| Unit tests | Vitest + @testing-library/react |
| E2E tests | Playwright (headful Chrome) |

---

## Project Structure

```
src/
  content/          # Content script — extracts page content, opens workspace
  background/       # Service worker — handles toolbar icon click
  workspace/
    components/     # React components (ArticlePanel, ChatPanel, SettingsPage, …)
    hooks/          # useStream, useChatHistory, useHighlights, useSettings, useReaderSettings
    providers/      # Claude, OpenAI, Gemini, Deepseek streaming adapters
    themes.ts       # Eight theme token sets (light + dark each)
    styles.css
    App.tsx
public/
  icons/            # Extension icons (16, 48, 128 px)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Chrome or Chromium

### Install dependencies

```bash
npm install
```

### Build the extension

```bash
npm run build
```

Output goes to `dist/`.

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

## Usage

1. Navigate to any article or webpage
2. Click the **MindTraceReader** icon in the Chrome toolbar
3. The article opens in a clean workspace tab
4. Use the **reader controls** in the header to adjust font, width, and mode
5. Open **Settings** (gear icon) to choose a theme, configure your AI provider, and set a default highlight color
6. Open the **AI chat panel** (💬) to summarize, ask questions, or explore the article
7. **Select text** to highlight it; click an existing highlight to edit color, add a note, or delete

---

## Running Tests

```bash
# Unit tests
npm test

# Unit tests in watch mode
npm run test:watch

# End-to-end tests (requires a built extension)
npm run build
npm run test:e2e
```

> Playwright runs Chrome in headful mode — extensions are not supported in headless Chrome.

---

## License

MIT
