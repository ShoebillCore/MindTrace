import type { OutlineItem } from '../hooks/useOutline'

interface OutlinePanelProps {
  items: OutlineItem[]
  activeId: string | null
  isOpen: boolean
}

export default function OutlinePanel({ items, activeId, isOpen }: OutlinePanelProps) {
  if (items.length === 0) return null

  return (
    <nav className={`outline-panel${isOpen ? '' : ' closed'}`}>
      <div className="outline-panel-inner">
        <div className="outline-panel-title">Outline</div>
        {items.map((item) => (
          <button
            key={item.id}
            className={`outline-item${item.id === activeId ? ' active' : ''}`}
            style={{ paddingLeft: `${14 + (item.level - 1) * 10}px` }}
            onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
            title={item.text}
          >
            {item.text}
          </button>
        ))}
      </div>
    </nav>
  )
}
