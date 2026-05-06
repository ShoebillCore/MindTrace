import { useState, useEffect } from 'react'

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'

export interface Highlight {
  id: string
  url: string
  quote: string
  color: HighlightColor
  comment?: string
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

  const addHighlight = (quote: string, color: HighlightColor, comment?: string) => {
    const h: Highlight = { id: Date.now().toString(), url, quote, color, ...(comment ? { comment } : {}) }
    persist([...highlights, h])
  }

  const updateHighlight = (id: string, changes: { color?: HighlightColor; comment?: string }) => {
    persist(highlights.map((h) => (h.id === id ? { ...h, ...changes } : h)))
  }

  const removeHighlight = (id: string) => {
    persist(highlights.filter((h) => h.id !== id))
  }

  return { highlights, addHighlight, updateHighlight, removeHighlight }
}
