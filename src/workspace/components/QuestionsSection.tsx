import { useEffect } from 'react'
import { useStream } from '../hooks/useStream'
import type { AIProvider, CapturedPage } from '../providers/types'
import QuestionCard from './QuestionCard'

const SYSTEM_PROMPT =
  'You are a curious reading companion. Generate exactly 4 thought-provoking questions ' +
  'that a careful reader should consider about this article. Return one question per line. ' +
  'No numbering, no bullet points, no other text — just 4 lines, one question each.'

interface QuestionsSectionProps {
  page: CapturedPage
  provider: AIProvider
}

function errorMessage(errorStatus?: number): string {
  if (errorStatus === 429) return 'Rate limited — wait a moment and retry.'
  if (errorStatus === 401 || errorStatus === 403) return 'Invalid API key — check your settings.'
  return 'Connection lost — retry?'
}

export default function QuestionsSection({ page, provider }: QuestionsSectionProps) {
  const { text, status, error, errorStatus, start } = useStream(provider)

  useEffect(() => {
    start(SYSTEM_PROMPT, page.textContent.slice(0, 8000))
  }, [page.url, provider.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const questions =
    status === 'done'
      ? text
          .split('\n')
          .map((q) => q.trim())
          .filter((q) => q.length > 0)
      : []

  return (
    <div className="section-card">
      <div className="section-label section-label--blue">? Questions to Consider</div>

      {status === 'loading' && (
        <>
          <div className="skeleton-line" style={{ width: '80%' }} />
          <div className="skeleton-line" style={{ width: '72%' }} />
          <div className="skeleton-line" style={{ width: '88%' }} />
          <div className="skeleton-line" style={{ width: '65%' }} />
        </>
      )}

      {status === 'streaming' && (
        <p className="streaming-text" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Generating questions…
        </p>
      )}

      {status === 'done' && (
        <div className="question-list">
          {questions.map((q, i) => (
            <QuestionCard
              key={i}
              question={q}
              articleText={page.textContent}
              provider={provider}
            />
          ))}
        </div>
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
