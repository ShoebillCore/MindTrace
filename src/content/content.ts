import Defuddle from 'defuddle'
import DOMPurify from 'dompurify'
import type { CapturedPage } from '../workspace/providers/types'

function showToast(message: string): void {
  const existing = document.getElementById('mindtrace-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = 'mindtrace-toast'
  toast.textContent = message
  toast.style.cssText = [
    'position:fixed',
    'bottom:24px',
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

async function openMindTrace(): Promise<void> {
  const result = new Defuddle(document).parse()

  if (!result?.content?.trim()) {
    showToast("MindTraceReader couldn't extract readable content from this page.")
    return
  }

  const sanitizedHtml = DOMPurify.sanitize(result.content)

  const tempDoc = new DOMParser().parseFromString(sanitizedHtml, 'text/html')
  const textContent = tempDoc.body.textContent ?? ''

  const wordCount = result.wordCount ?? textContent.trim().split(/\s+/).filter(Boolean).length

  const captured: CapturedPage = {
    title: result.title || document.title,
    byline: result.author || '',
    siteName: result.site || new URL(location.href).hostname,
    content: sanitizedHtml,
    textContent,
    excerpt: result.description || '',
    wordCount,
    isShort: wordCount < 200,
    url: location.href,
  }

  window.open(chrome.runtime.getURL('src/workspace/workspace.html'), '_blank')
  await chrome.storage.local.set({ capturedPage: captured })
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'OPEN_MINDTRACE') openMindTrace()
})
