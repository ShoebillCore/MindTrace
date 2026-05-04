import { useLayoutEffect, useEffect, useState } from 'react'
import type { CapturedPage } from '../providers/types'

export interface OutlineItem {
  id: string
  text: string
  level: number
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function useOutline(
  ref: React.RefObject<HTMLDivElement | null>,
  page: CapturedPage | null,
): { items: OutlineItem[]; activeId: string | null } {
  const [items, setItems] = useState<OutlineItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useLayoutEffect(() => {
    const body = ref.current
    if (!body || !page) {
      setItems([])
      setActiveId(null)
      return
    }

    const headings = Array.from(body.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6'))
    const seen = new Map<string, number>()
    const extracted: OutlineItem[] = []

    for (const el of headings) {
      const text = el.textContent?.trim() ?? ''
      if (!text) continue
      const level = parseInt(el.tagName[1], 10)
      let base = slugify(text) || `heading-${extracted.length}`
      const count = seen.get(base) ?? 0
      const id = count === 0 ? base : `${base}-${count}`
      seen.set(base, count + 1)
      el.id = id
      extracted.push({ id, text, level })
    }

    setItems(extracted)
    setActiveId(extracted[0]?.id ?? null)
  }, [page, ref])

  useEffect(() => {
    if (items.length === 0) return

    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[]

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId((entry.target as HTMLElement).id)
            break
          }
        }
      },
      { rootMargin: '0px 0px -80% 0px', threshold: 0 },
    )

    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [items])

  return { items, activeId }
}
