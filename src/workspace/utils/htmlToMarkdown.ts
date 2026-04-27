import type { CapturedPage } from '../providers/types'

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as Element
  const tag = el.tagName.toLowerCase()
  const children = () => Array.from(el.childNodes).map(nodeToMarkdown).join('')

  switch (tag) {
    case 'h1': return `# ${children().trim()}\n\n`
    case 'h2': return `## ${children().trim()}\n\n`
    case 'h3': return `### ${children().trim()}\n\n`
    case 'h4': return `#### ${children().trim()}\n\n`
    case 'h5': return `##### ${children().trim()}\n\n`
    case 'h6': return `###### ${children().trim()}\n\n`
    case 'p':  return `${children().trim()}\n\n`
    case 'br': return '\n'
    case 'strong':
    case 'b':  return `**${children()}**`
    case 'em':
    case 'i':  return `*${children()}*`
    case 'a': {
      const href = el.getAttribute('href') ?? ''
      const text = children().trim()
      return href ? `[${text}](${href})` : text
    }
    case 'code': {
      // Inline code only — pre > code is handled by the 'pre' case
      if (el.closest('pre')) return el.textContent ?? ''
      return `\`${children()}\``
    }
    case 'pre': {
      const codeEl = el.querySelector('code')
      const content = (codeEl ? codeEl.textContent : el.textContent) ?? ''
      return `\`\`\`\n${content.trim()}\n\`\`\`\n\n`
    }
    case 'blockquote':
      return children()
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n') + '\n\n'
    case 'ul': {
      const items = Array.from(el.children)
        .filter((c) => c.tagName.toLowerCase() === 'li')
        .map((li) => `- ${nodeToMarkdown(li).trim()}`)
        .join('\n')
      return `${items}\n\n`
    }
    case 'ol': {
      const items = Array.from(el.children)
        .filter((c) => c.tagName.toLowerCase() === 'li')
        .map((li, idx) => `${idx + 1}. ${nodeToMarkdown(li).trim()}`)
        .join('\n')
      return `${items}\n\n`
    }
    case 'li':   return children()
    case 'hr':   return `---\n\n`
    case 'img': {
      const alt = el.getAttribute('alt') ?? ''
      const src = el.getAttribute('src') ?? ''
      return src ? `![${alt}](${src})` : ''
    }
    case 'script':
    case 'style':
    case 'nav':
    case 'aside':
      return ''
    default:
      return children()
  }
}

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return nodeToMarkdown(doc.body).trim()
}

export function downloadPageAsMarkdown(page: CapturedPage): void {
  const parts: string[] = []
  parts.push(`# ${page.title}`)
  parts.push('')
  if (page.byline || page.siteName) {
    const meta = [page.byline, page.siteName].filter(Boolean).join(' · ')
    parts.push(`*${meta}*`)
    parts.push('')
  }
  parts.push(`Source: ${page.url}`)
  parts.push('')
  parts.push('---')
  parts.push('')
  parts.push(htmlToMarkdown(page.content))

  const blob = new Blob([parts.join('\n')], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${page.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '')}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
