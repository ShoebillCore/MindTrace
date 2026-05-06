import { useEffect, useState } from 'react'
import type { Settings, ProviderName } from '../providers/types'
import { saveFolderHandle, clearFolderHandle } from '../utils/folderStore'

interface SettingsDrawerProps {
  settings: Settings
  onSave: (apiKeys: Record<ProviderName, string>) => void
  onClose: () => void
}

const PROVIDERS: { value: ProviderName; label: string; placeholder: string }[] = [
  { value: 'claude', label: 'Claude (Anthropic)', placeholder: 'sk-ant-…' },
  { value: 'openai', label: 'OpenAI',             placeholder: 'sk-…'     },
  { value: 'gemini', label: 'Gemini (Google AI)', placeholder: 'AI…'      },
]

export default function SettingsDrawer({ settings, onSave, onClose }: SettingsDrawerProps) {
  const [keys, setKeys] = useState<Record<ProviderName, string>>({ ...settings.apiKeys })
  const [folderName, setFolderName] = useState('')
  const [folderPending, setFolderPending] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)

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

  function save() {
    onSave(keys)
    onClose()
  }

  const configuredCount = PROVIDERS.filter((p) => keys[p.value].trim()).length

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>

        <div className="settings-title">Settings</div>

        {/* ── AI Providers (collapsible) ── */}
        <div className="settings-section">
          <button className="settings-section-toggle" onClick={() => setAiOpen((o) => !o)}>
            <span className="settings-section-toggle-label">
              <span className="settings-section-mark">{aiOpen ? '−' : '+'}</span>
              AI Providers
            </span>
            <span className="settings-section-badge">
              {configuredCount > 0 ? `${configuredCount} / ${PROVIDERS.length} set` : 'none set'}
            </span>
          </button>

          {aiOpen && (
            <div className="settings-section-body">
              {PROVIDERS.map((p) => (
                <div className="settings-field" key={p.value}>
                  <label htmlFor={`key-${p.value}`}>{p.label}</label>
                  <input
                    id={`key-${p.value}`}
                    type="password"
                    placeholder={p.placeholder}
                    value={keys[p.value]}
                    onChange={(e) => setKeys((prev) => ({ ...prev, [p.value]: e.target.value }))}
                  />
                </div>
              ))}
              <p className="settings-note">
                Keys are stored locally and sent only to the respective provider.
              </p>
            </div>
          )}
        </div>

        {/* ── Download Folder (collapsible) ── */}
        <div className="settings-section">
          <button className="settings-section-toggle" onClick={() => setFolderOpen((o) => !o)}>
            <span className="settings-section-toggle-label">
              <span className="settings-section-mark">{folderOpen ? '−' : '+'}</span>
              Download Folder
            </span>
            <span className="settings-section-badge">
              {folderName ? folderName : 'not set'}
            </span>
          </button>

          {folderOpen && (
            <div className="settings-section-body">
              {folderName ? (
                <div className="settings-folder-set">
                  <span className="settings-folder-name" title={folderName}>[{folderName}]</span>
                  <div className="settings-folder-actions">
                    <button className="settings-folder-btn" onClick={handleChooseFolder} disabled={folderPending}>
                      Change
                    </button>
                    <button className="settings-folder-btn settings-folder-btn--clear" onClick={handleClearFolder}>
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="settings-folder-unset">
                  <span className="settings-folder-hint">Prompts on each download</span>
                  <button className="settings-folder-btn" onClick={handleChooseFolder} disabled={folderPending}>
                    {folderPending ? 'Choosing…' : 'Choose'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="settings-section settings-section--actions">
          <button className="settings-save-btn" onClick={save}>Save &amp; Close</button>
          <button className="settings-cancel-btn" onClick={onClose}>Cancel</button>
        </div>

      </div>
    </div>
  )
}
