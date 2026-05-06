import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { HighlightColor } from '../hooks/useHighlights'

const COLORS: { color: HighlightColor; hex: string }[] = [
  { color: 'yellow', hex: '#facc15' },
  { color: 'green',  hex: '#4ade80' },
  { color: 'blue',   hex: '#60a5fa' },
  { color: 'pink',   hex: '#f472b6' },
  { color: 'purple', hex: '#a78bfa' },
]

interface HighlightFlashPillProps {
  position: { top: number; left: number }
  currentColor: HighlightColor
  onColorChange: (color: HighlightColor) => void
  onDismiss: () => void
}

export default function HighlightFlashPill({
  position, currentColor, onColorChange, onDismiss,
}: HighlightFlashPillProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
  }

  const startTimer = () => {
    clearTimer()
    timerRef.current = setTimeout(onDismiss, 2000)
  }

  useEffect(() => {
    startTimer()
    return clearTimer
  }, [])

  return createPortal(
    <div
      className="hl-flash-pill"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
    >
      {COLORS.map(({ color, hex }) => (
        <button
          key={color}
          className={`fp-dot${color === currentColor ? ' fp-dot--active' : ''}`}
          style={{ background: hex }}
          onClick={() => { onColorChange(color); onDismiss() }}
          aria-label={`Change to ${color}`}
        />
      ))}
    </div>,
    document.body,
  )
}
