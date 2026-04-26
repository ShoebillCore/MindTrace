import { useState } from 'react'
import type { Settings, ProviderName } from '../providers/types'

interface SettingsDrawerProps {
  settings: Settings
  onSave: (apiKeys: Record<ProviderName, string>) => void
  onClose: () => void
}

const PROVIDERS: { value: ProviderName; label: string; placeholder: string }[] = [
  { value: 'claude', label: 'Claude (Anthropic)', placeholder: 'sk-ant-…' },
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-…' },
  { value: 'gemini', label: 'Gemini (Google AI)', placeholder: 'AI…' },
]

export default function SettingsDrawer({
  settings,
  onSave,
  onClose,
}: SettingsDrawerProps) {
  const [keys, setKeys] = useState<Record<ProviderName, string>>({
    ...settings.apiKeys,
  })

  function save() {
    onSave(keys)
    onClose()
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <span className="settings-title">Settings</span>

        {PROVIDERS.map((p) => (
          <div className="settings-field" key={p.value}>
            <label htmlFor={`key-${p.value}`}>{p.label} API Key</label>
            <input
              id={`key-${p.value}`}
              type="password"
              placeholder={p.placeholder}
              value={keys[p.value]}
              onChange={(e) =>
                setKeys((prev) => ({ ...prev, [p.value]: e.target.value }))
              }
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="settings-close" onClick={save}>
            Save &amp; Close
          </button>
          <button className="settings-close" onClick={onClose}>
            Cancel
          </button>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          API keys are stored locally in your browser and never sent anywhere
          except directly to the respective AI provider.
        </p>
      </div>
    </div>
  )
}
