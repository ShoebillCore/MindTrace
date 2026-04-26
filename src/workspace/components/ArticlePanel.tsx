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
