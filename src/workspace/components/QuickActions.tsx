import type { Message } from '../hooks/useChatHistory'

export const QUICK_SYSTEM_PROMPTS: Record<string, string> = {
  Summary:
    'You are a precise reading assistant. Summarize the article in 3-5 sentences. Focus on the core argument, key evidence, and main conclusion. Be concise.',
  'Deep Insight':
    'You are an analytical reading assistant. Identify 3 deeper insights, implications, or connections that a thoughtful reader would find valuable. Go beyond surface-level summary.',
  Questions:
    'You are a Socratic reading assistant. Generate 5 thought-provoking questions about the article that encourage critical thinking and deeper understanding.',
}

const ACTIONS: NonNullable<Message['label']>[] = ['Summary', 'Deep Insight', 'Questions']

interface QuickActionsProps {
  disabled: boolean
  onAction: (label: NonNullable<Message['label']>, systemPrompt: string) => void
}

export default function QuickActions({ disabled, onAction }: QuickActionsProps) {
  return (
    <div className="quick-actions">
      {ACTIONS.map((label) => (
        <button
          key={label}
          className="quick-action-btn"
          disabled={disabled}
          onClick={() => onAction(label, QUICK_SYSTEM_PROMPTS[label])}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
