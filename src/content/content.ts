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
