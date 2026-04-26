import type { AIProvider, CapturedPage } from '../providers/types'
import SummarySection from './SummarySection'
import QuestionsSection from './QuestionsSection'
import InsightsSection from './InsightsSection'

interface WorkspacePanelProps {
  page: CapturedPage | null
  provider: AIProvider | null
  onSettingsOpen: () => void
}

export default function WorkspacePanel({
  page,
  provider,
  onSettingsOpen,
}: WorkspacePanelProps) {
  if (!page) {
    return (
      <div className="workspace-panel">
        <div className="no-key-prompt">
          Navigate to an article and click the MindTrace button to get started.
        </div>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="workspace-panel">
        <div className="no-key-prompt">
          <p>Enter an API key to activate the AI workspace.</p>
          <button onClick={onSettingsOpen}>Open Settings</button>
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-panel">
      <SummarySection page={page} provider={provider} />
      <QuestionsSection page={page} provider={provider} />
      <InsightsSection page={page} provider={provider} />
    </div>
  )
}
