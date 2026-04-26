import { useState } from 'react'
import { useStream } from '../hooks/useStream'
import type { AIProvider } from '../providers/types'

const DEEPER_SYSTEM =
  'You are a thoughtful reading companion. The user is reading an article and has a question. ' +
  'Provide a focused, insightful 3-4 sentence answer grounded in the article content. ' +
  'You may expand beyond the article when relevant, but stay concise.'

interface QuestionCardProps {
  question: string
  articleText: string
  provider: AIProvider
}

function errorMessage(errorStatus?: number): string {
  if (errorStatus === 429) return 'Rate limited — wait a moment and retry.'
  if (errorStatus === 401 || errorStatus === 403) return 'Invalid API key — check your settings.'
  return 'Connection lost — retry?'
}

export default function QuestionCard({
  question,
  articleText,
  provider,
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { text, status, error, errorStatus, start } = useStream(provider)

  function toggle() {
    const next = !expanded
    setExpanded(next)
    if (next && status === 'idle') {
      const userContent = `Article:\n${articleText.slice(0, 6000)}\n\nQuestion: ${question}`
      start(DEEPER_SYSTEM, userContent)
    }
  }

  return (
    <div
      className={`question-card ${expanded ? 'question-card--expanded' : ''}`}
      onClick={toggle}
    >
      <div className="question-card-header">
        <span>{question}</span>
        <span className={`question-card-chevron ${expanded ? 'question-card-chevron--open' : ''}`}>
          ▶
        </span>
      </div>

      {expanded && (
        <div className="question-card-body">
          {status === 'loading' && (
            <>
              <div className="skeleton-line" style={{ width: '88%' }} />
              <div className="skeleton-line" style={{ width: '70%' }} />
            </>
          )}
          {(status === 'streaming' || status === 'done') && (
            <p className="streaming-text">{text}</p>
          )}
          {status === 'error' && (
            <div className="error-state" onClick={(e) => e.stopPropagation()}>
              <span>{errorMessage(errorStatus)}</span>
              <button
                className="retry-btn"
                onClick={() => {
                  const userContent = `Article:\n${articleText.slice(0, 6000)}\n\nQuestion: ${question}`
                  start(DEEPER_SYSTEM, userContent)
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
