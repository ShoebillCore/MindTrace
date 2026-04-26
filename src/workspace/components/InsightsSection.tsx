import { useEffect } from 'react'
import { useStream } from '../hooks/useStream'
import type { AIProvider, CapturedPage } from '../providers/types'

const SYSTEM_PROMPT =
  'You are an expert reading companion. Based on the article, provide 3-5 sentences of deeper context: ' +
  'related concepts, relevant prior work, broader implications, or intellectual connections the article touches on. ' +
  'Be specific and intellectually substantive.'

interface InsightsSectionProps {
  page: CapturedPage
  provider: AIProvider
}

function errorMessage(errorStatus?: number): string {
  if (errorStatus === 429) return 'Rate limited — wait a moment and retry.'
  if (errorStatus === 401 || errorStatus === 403) return 'Invalid API key — check your settings.'
  return 'Connection lost — retry?'
}

export default function InsightsSection({ page, provider }: InsightsSectionProps) {
  const { text, status, error, errorStatus, start } = useStream(provider)

  useEffect(() => {
    start(SYSTEM_PROMPT, page.textContent.slice(0, 8000))
  }, [page.url, provider.name]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="section-card">
      <div className="section-label section-label--green">◆ Deeper Insights</div>

      {status === 'loading' && (
        <>
          <div className="skeleton-line" style={{ width: '93%' }} />
          <div className="skeleton-line" style={{ width: '80%' }} />
          <div className="skeleton-line" style={{ width: '87%' }} />
        </>
      )}

      {(status === 'streaming' || status === 'done') && (
        <p className="streaming-text">{text}</p>
      )}

      {status === 'error' && (
        <div className="error-state">
          <span>{error ? errorMessage(errorStatus) : 'Something went wrong.'}</span>
          <button
            className="retry-btn"
            onClick={() => start(SYSTEM_PROMPT, page.textContent.slice(0, 8000))}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
