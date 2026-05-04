import type { CapturedPage, Settings, ProviderName } from '../providers/types'
import type { Theme } from '../hooks/useTheme'

interface HeaderProps {
  page: CapturedPage | null
  settings: Settings
  theme: Theme
  outlineOpen: boolean
  onOutlineToggle: () => void
  onThemeToggle: () => void
  onProviderChange: (p: ProviderName) => void
  onSettingsOpen: () => void
  onDownload: () => void
}

const PROVIDERS: { value: ProviderName; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
]

export default function Header({
  page,
  settings,
  theme,
  outlineOpen,
  onOutlineToggle,
  onThemeToggle,
  onProviderChange,
  onSettingsOpen,
  onDownload,
}: HeaderProps) {
  const isDark = theme === 'dark'

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="outline-toggle-btn"
          onClick={onOutlineToggle}
          disabled={!page}
          title={outlineOpen ? 'Hide outline' : 'Show outline'}
          aria-label="Toggle outline panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="3" y1="4" x2="13" y2="4" />
            <line x1="6" y1="8" x2="13" y2="8" />
            <line x1="6" y1="12" x2="13" y2="12" />
            <line x1="3" y1="8" x2="3" y2="8" strokeWidth="2" />
            <line x1="3" y1="12" x2="3" y2="12" strokeWidth="2" />
          </svg>
        </button>
      </div>
      <div className="header-right">
        <select
          className="provider-select"
          value={settings.selectedProvider}
          onChange={(e) => onProviderChange(e.target.value as ProviderName)}
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <button
          className="theme-toggle"
          onClick={onThemeToggle}
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          <div
            className="theme-toggle-knob"
            style={{ left: isDark ? '16px' : '3px' }}
          />
        </button>

        <button
          className="download-btn"
          onClick={onDownload}
          disabled={!page}
          title="Download article as Markdown (.md file)"
          aria-label="Download article as Markdown"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 1.5v8" />
            <path d="M4.5 7l3 2.5 3-2.5" />
            <path d="M2.5 12.5h10" />
          </svg>
        </button>

        <button
          className="settings-btn"
          onClick={onSettingsOpen}
          title="Settings"
        >
          ⚙
        </button>
      </div>
    </header>
  )
}
