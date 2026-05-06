import { useEffect, useState } from 'react'
import type { ProviderName, Settings } from '../providers/types'
import type { ReaderSettings } from '../hooks/useReaderSettings'
import { THEME_META, THEMES } from '../themes'
import { saveFolderHandle, clearFolderHandle } from '../utils/folderStore'
import type { HighlightColor } from '../hooks/useHighlights'

type Section = 'highlighter' | 'reader' | 'interpreter' | 'general'

const HIGHLIGHT_COLORS: { color: HighlightColor; hex: string }[] = [
  { color: 'yellow', hex: '#facc15' },
  { color: 'green',  hex: '#4ade80' },
  { color: 'blue',   hex: '#60a5fa' },
  { color: 'pink',   hex: '#f472b6' },
  { color: 'purple', hex: '#a78bfa' },
]

const PROVIDERS: { value: ProviderName; label: string; placeholder: string }[] = [
  { value: 'claude',   label: 'Anthropic', placeholder: 'sk-ant-…' },
  { value: 'openai',   label: 'OpenAI',    placeholder: 'sk-…'     },
  { value: 'deepseek', label: 'Deepseek',  placeholder: 'sk-…'     },
  { value: 'gemini',   label: 'Gemini',    placeholder: 'AI…'      },
]

const PROVIDER_MODELS: Record<ProviderName, { value: string; label: string }[]> = {
  claude: [
    { value: 'claude-sonnet-4-6',        label: 'Claude Sonnet 4.6' },
    { value: 'claude-opus-4-7',          label: 'Claude Opus 4.7' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  openai: [
    { value: 'gpt-4o',       label: 'GPT-4o' },
    { value: 'gpt-4o-mini',  label: 'GPT-4o mini' },
    { value: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
    { value: 'o1',           label: 'o1' },
    { value: 'o1-mini',      label: 'o1 mini' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash',      label: 'Gemini 1.5 Flash' },
  ],
  deepseek: [
    { value: 'deepseek-chat',      label: 'DeepSeek V3' },
    { value: 'deepseek-reasoner',  label: 'DeepSeek R1' },
  ],
}

const NAV_ITEMS: { key: Section; icon: string; label: string }[] = [
  { key: 'highlighter', icon: '✦', label: 'Highlighter' },
  { key: 'reader',      icon: '⊡', label: 'Reader' },
  { key: 'interpreter', icon: '◈', label: 'Interpreter' },
  { key: 'general',     icon: '↓', label: 'General' },
]

interface SettingsPageProps {
  settings: Settings
  readerSettings: ReaderSettings
  defaultHighlightColor: HighlightColor
  onReaderChange: (next: Partial<ReaderSettings>) => void
  onSave: (
    apiKeys: Record<ProviderName, string>,
    selectedProvider: ProviderName,
    defaultHighlightColor: HighlightColor,
    selectedModels: Record<ProviderName, string>,
  ) => void
  onCancel: () => void
}

export default function SettingsPage({
  settings,
  readerSettings,
  defaultHighlightColor,
  onReaderChange,
  onSave,
  onCancel,
}: SettingsPageProps) {
  const [section, setSection] = useState<Section>('highlighter')
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>(settings.selectedProvider)
  const [keys, setKeys] = useState<Record<ProviderName, string>>({ ...settings.apiKeys })
  const [selectedModels, setSelectedModels] = useState<Record<ProviderName, string>>({ ...settings.selectedModels })
  const [defaultColor, setDefaultColor] = useState<HighlightColor>(defaultHighlightColor)
  const [folderName, setFolderName] = useState('')
  const [folderPending, setFolderPending] = useState(false)

  useEffect(() => {
    chrome.storage.local.get('downloadFolderName').then((data) => {
      setFolderName((data.downloadFolderName as string) ?? '')
    })
  }, [])

  async function handleChooseFolder() {
    if (!('showDirectoryPicker' in window)) return
    setFolderPending(true)
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      await saveFolderHandle(handle)
      chrome.storage.local.set({ downloadFolderName: handle.name })
      setFolderName(handle.name)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error(err)
    } finally {
      setFolderPending(false)
    }
  }

  async function handleClearFolder() {
    await clearFolderHandle()
    chrome.storage.local.remove('downloadFolderName')
    setFolderName('')
  }

  return (
    <div className="sp-overlay" onMouseDown={onCancel}>
      <div className="sp-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sp-header">
          <span className="sp-title">Settings</span>
          <button className="sp-close" onClick={onCancel}>×</button>
        </div>

        <div className="sp-body">
          <div className="sp-nav">
            {NAV_ITEMS.map(({ key, icon, label }) => (
              <button
                key={key}
                className={`sp-nav-item${section === key ? ' active' : ''}`}
                onClick={() => setSection(key)}
              >
                <span className="sp-nav-icon">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          <div className="sp-content">
            {section === 'highlighter' && (
              <HighlighterSection defaultColor={defaultColor} onColorChange={setDefaultColor} />
            )}
            {section === 'reader' && (
              <ReaderSection settings={readerSettings} onChange={onReaderChange} />
            )}
            {section === 'interpreter' && (
              <InterpreterSection
                selectedProvider={selectedProvider}
                keys={keys}
                selectedModels={selectedModels}
                onProviderChange={setSelectedProvider}
                onKeyChange={(provider, key) =>
                  setKeys((prev) => ({ ...prev, [provider]: key }))
                }
                onModelChange={(provider, model) =>
                  setSelectedModels((prev) => ({ ...prev, [provider]: model }))
                }
              />
            )}
            {section === 'general' && (
              <GeneralSection
                folderName={folderName}
                folderPending={folderPending}
                onChooseFolder={handleChooseFolder}
                onClearFolder={handleClearFolder}
              />
            )}
          </div>
        </div>

        <div className="sp-footer">
          <button className="sp-btn sp-btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="sp-btn sp-btn-primary"
            onClick={() => onSave(keys, selectedProvider, defaultColor, selectedModels)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function HighlighterSection({
  defaultColor,
  onColorChange,
}: {
  defaultColor: HighlightColor
  onColorChange: (c: HighlightColor) => void
}) {
  return (
    <div>
      <div className="sp-section-title">Highlighter</div>
      <div className="sp-field-label">Default Color</div>
      <div className="sp-swatches">
        {HIGHLIGHT_COLORS.map(({ color, hex }) => (
          <button
            key={color}
            className={`sp-swatch${defaultColor === color ? ' active' : ''}`}
            style={{ background: hex }}
            onClick={() => onColorChange(color)}
            aria-label={`Set ${color} as default`}
          />
        ))}
      </div>
      <div className="sp-note">Pre-selected color when highlighting new text.</div>
    </div>
  )
}

function ReaderSection({
  settings,
  onChange,
}: {
  settings: ReaderSettings
  onChange: (next: Partial<ReaderSettings>) => void
}) {
  return (
    <div>
      <div className="sp-section-title">Reading Display</div>

      <div className="sp-step-row">
        <span className="sp-field-label" style={{ margin: 0 }}>Font Size</span>
        <div className="sp-step-group">
          <button
            className="sp-step-btn"
            onClick={() => onChange({ fontSize: Math.max(12, settings.fontSize - 1) })}
          >−</button>
          <span className="sp-step-val">{settings.fontSize}px</span>
          <button
            className="sp-step-btn"
            onClick={() => onChange({ fontSize: Math.min(24, settings.fontSize + 1) })}
          >+</button>
        </div>
      </div>

      <div className="sp-step-row">
        <span className="sp-field-label" style={{ margin: 0 }}>Content Width</span>
        <div className="sp-step-group">
          <button
            className="sp-step-btn"
            onClick={() => onChange({ contentWidth: Math.max(30, settings.contentWidth - 5) })}
          >−</button>
          <span className="sp-step-val">{settings.contentWidth}%</span>
          <button
            className="sp-step-btn"
            onClick={() => onChange({ contentWidth: Math.min(90, settings.contentWidth + 5) })}
          >+</button>
        </div>
      </div>

      <div className="sp-divider" />

      <div className="sp-field-label">Mode</div>
      <div className="sp-mode-pill">
        <button
          className={`sp-mode-btn${settings.mode === 'light' ? ' active' : ''}`}
          onClick={() => onChange({ mode: 'light' })}
        >Light</button>
        <button
          className={`sp-mode-btn${settings.mode === 'dark' ? ' active' : ''}`}
          onClick={() => onChange({ mode: 'dark' })}
        >Dark</button>
      </div>

      <div className="sp-field-label">Theme</div>
      <div className="sp-themes">
        {THEME_META.map((t) => {
          const tokens = THEMES[t.id][settings.mode]
          return (
            <button
              key={t.id}
              className={`sp-theme${settings.colorScheme === t.id ? ' active' : ''}`}
              onClick={() => onChange({ colorScheme: t.id })}
              aria-label={t.label}
            >
              <div
                className="sp-theme-preview"
                style={{ background: tokens['--bg-primary'] }}
              >
                <div className="sp-theme-bar" style={{ background: tokens['--text-primary'], width: '70%' }} />
                <div className="sp-theme-bar" style={{ background: tokens['--text-secondary'], width: '45%' }} />
                <div className="sp-theme-bar" style={{ background: tokens['--text-secondary'], width: '60%' }} />
              </div>
              <div className="sp-theme-label" style={{ background: tokens['--bg-secondary'], color: tokens['--text-muted'] }}>
                {t.label}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function InterpreterSection({
  selectedProvider,
  keys,
  selectedModels,
  onProviderChange,
  onKeyChange,
  onModelChange,
}: {
  selectedProvider: ProviderName
  keys: Record<ProviderName, string>
  selectedModels: Record<ProviderName, string>
  onProviderChange: (p: ProviderName) => void
  onKeyChange: (p: ProviderName, key: string) => void
  onModelChange: (p: ProviderName, model: string) => void
}) {
  const current = PROVIDERS.find((p) => p.value === selectedProvider)!
  const models = PROVIDER_MODELS[selectedProvider]

  return (
    <div>
      <div className="sp-section-title">AI Interpreter</div>

      <div className="sp-field-label">Provider</div>
      <select
        className="sp-select"
        value={selectedProvider}
        onChange={(e) => onProviderChange(e.target.value as ProviderName)}
      >
        {PROVIDERS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      <div className="sp-field-label">Model</div>
      <select
        className="sp-select"
        value={selectedModels[selectedProvider]}
        onChange={(e) => onModelChange(selectedProvider, e.target.value)}
      >
        {models.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      <div className="sp-field-label">API Key — {current.label}</div>
      <input
        className="sp-input"
        type="password"
        placeholder={current.placeholder}
        value={keys[selectedProvider] ?? ''}
        onChange={(e) => onKeyChange(selectedProvider, e.target.value)}
        autoComplete="off"
      />
      <div className="sp-note">Stored locally · sent only to {current.label}'s servers</div>
    </div>
  )
}

function GeneralSection({
  folderName,
  folderPending,
  onChooseFolder,
  onClearFolder,
}: {
  folderName: string
  folderPending: boolean
  onChooseFolder: () => void
  onClearFolder: () => void
}) {
  return (
    <div>
      <div className="sp-section-title">General</div>
      <div className="sp-field-label">Download Folder</div>
      {folderName ? (
        <div className="sp-folder-set">
          <span className="sp-folder-name" title={folderName}>[{folderName}]</span>
          <div className="sp-folder-actions">
            <button className="sp-folder-btn" onClick={onChooseFolder} disabled={folderPending}>
              Change
            </button>
            <button className="sp-folder-btn sp-folder-btn--clear" onClick={onClearFolder}>
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="sp-folder-unset">
          <span className="sp-note">Prompts for a folder on each download</span>
          <button className="sp-folder-btn" onClick={onChooseFolder} disabled={folderPending}>
            {folderPending ? 'Choosing…' : 'Choose folder'}
          </button>
        </div>
      )}
    </div>
  )
}
