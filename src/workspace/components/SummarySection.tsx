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
