import { THEME_META } from '../themes'
import type { ReaderSettings } from '../hooks/useReaderSettings'

interface ReaderSettingsPopupProps {
  settings: ReaderSettings
  onChange: (next: Partial<ReaderSettings>) => void
}

export default function ReaderSettingsPopup({ settings, onChange }: ReaderSettingsPopupProps) {
  return (
    <div className="reader-settings-popup">
      <div className="reader-settings-row">
        <span className="reader-settings-label">Font Size</span>
        <div className="reader-step-group">
          <button
            className="reader-step-btn"
            onClick={() => onChange({ fontSize: Math.max(12, settings.fontSize - 1) })}
            aria-label="Decrease font size"
          >A−</button>
          <span className="reader-step-value">{settings.fontSize}px</span>
          <button
            className="reader-step-btn"
            onClick={() => onChange({ fontSize: Math.min(24, settings.fontSize + 1) })}
            aria-label="Increase font size"
          >A+</button>
        </div>
      </div>

      <div className="reader-settings-row">
        <span className="reader-settings-label">Width</span>
        <div className="reader-step-group">
          <button
            className="reader-step-btn"
            onClick={() => onChange({ contentWidth: Math.max(30, settings.contentWidth - 5) })}
            aria-label="Decrease content width"
          >−</button>
          <span className="reader-step-value">{settings.contentWidth}%</span>
          <button
            className="reader-step-btn"
            onClick={() => onChange({ contentWidth: Math.min(90, settings.contentWidth + 5) })}
            aria-label="Increase content width"
          >+</button>
        </div>
      </div>

      <div className="reader-settings-row">
        <span className="reader-settings-label">Mode</span>
        <div className="reader-mode-pill">
          <button
            className={`reader-mode-btn${settings.mode === 'light' ? ' active' : ''}`}
            onClick={() => onChange({ mode: 'light' })}
          >Light</button>
          <button
            className={`reader-mode-btn${settings.mode === 'dark' ? ' active' : ''}`}
            onClick={() => onChange({ mode: 'dark' })}
          >Dark</button>
        </div>
      </div>

      <div className="reader-settings-row">
        <span className="reader-settings-label">Theme</span>
        <select
          className="reader-theme-select"
          value={settings.colorScheme}
          onChange={(e) => onChange({ colorScheme: e.target.value as typeof settings.colorScheme })}
        >
          {THEME_META.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
