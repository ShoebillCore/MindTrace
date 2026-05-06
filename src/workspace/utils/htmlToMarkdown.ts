import type { CapturedPage } from '../providers/types'
import { getFolderHandle } from './folderStore'

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

function buildMarkdown(page: CapturedPage): string {
  const parts: string[] = []
  parts.push(`# ${page.title}`, '')
  if (page.byline || page.siteName) {
    parts.push(`*${[page.byline, page.siteName].filter(Boolean).join(' · ')}*`, '')
  }
  parts.push(`Source: ${page.url}`, '', '---', '', htmlToMarkdown(page.content))
  return parts.join('\n')
}

function buildFilename(title: string): string {
  return title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '') + '.md'
}

async function writeToFolder(
  folder: FileSystemDirectoryHandle,
  filename: string,
  content: string,
): Promise<boolean> {
  try {
    const perm = await folder.queryPermission({ mode: 'readwrite' })
    const granted =
      perm === 'granted' ||
      (perm === 'prompt' &&
        (await folder.requestPermission({ mode: 'readwrite' })) === 'granted')
    if (!granted) return false
    const file = await folder.getFileHandle(filename, { create: true })
    const writable = await file.createWritable()
    await writable.write(content)
    await writable.close()
    return true
  } catch {
    return false
  }
}

async function writeViaPicker(filename: string, content: string): Promise<boolean> {
  if (!('showSaveFilePicker' in window)) return false
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
    })
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
    return true
  } catch (err) {
    if ((err as Error).name === 'AbortError') return true  // user cancelled — not an error
    return false
  }
}

function writeViaAnchor(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Returns the folder name when the file was written silently to the stored
 * folder (no native OS feedback), so the caller can show its own toast.
 * Returns '' for the picker and anchor paths — those already surface feedback
 * through the OS save dialog or the browser download bar.
 */
export async function downloadPageAsMarkdown(page: CapturedPage): Promise<string> {
  const content = buildMarkdown(page)
  const filename = buildFilename(page.title)

  // 1. Stored default folder — silent write, caller must show feedback
  const folder = await getFolderHandle().catch(() => null)
  if (folder && await writeToFolder(folder, filename, content)) return folder.name

  // 2. Native OS save-file picker — dialog is its own feedback
  if (await writeViaPicker(filename, content)) return ''

  // 3. Legacy anchor-download — browser download bar is its own feedback
  writeViaAnchor(filename, content)
  return ''
}
