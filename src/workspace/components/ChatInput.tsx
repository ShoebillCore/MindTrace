import { useState, useEffect, useRef } from 'react'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled: boolean
  initialValue?: string
}

export default function ChatInput({ onSend, disabled, initialValue }: ChatInputProps) {
  const [value, setValue] = useState(initialValue ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue)
      const el = textareaRef.current
      if (el) {
        el.focus()
        const len = initialValue.length
        el.setSelectionRange(len, len)
      }
    }
  }, [initialValue])

  const handleSend = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-input-area">
      <div className="chat-input-container">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about this article…"
          disabled={disabled}
          rows={3}
        />
        <div className="chat-input-footer">
          <span className="chat-input-hint">↵ send · Shift+↵ newline</span>
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            aria-label="Send"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
