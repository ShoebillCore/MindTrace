import type { CapturedPage, Settings, ProviderName } from '../providers/types'
import type { Theme } from '../hooks/useTheme'

interface HeaderProps {
  page: CapturedPage | null
  settings: Settings
  theme: Theme
  onThemeToggle: () => void
  onProviderChange: (p: ProviderName) => void
  onSettingsOpen: () => void
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
  onThemeToggle,
  onProviderChange,
  onSettingsOpen,
}: HeaderProps) {
  const isDark = theme === 'dark'

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">MINDTRACE</span>
        {page && (
          <span className="header-breadcrumb">
            {page.siteName && `${page.siteName} · `}
            {page.title}
          </span>
        )}
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
