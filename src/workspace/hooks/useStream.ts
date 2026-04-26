import { useState, useCallback } from 'react'
import type { AIProvider, StreamStatus } from '../providers/types'
import { ProviderError } from '../providers/types'

interface StreamState {
  text: string
  status: StreamStatus
  error: string | null
  errorStatus: number | undefined
}

export function useStream(provider: AIProvider | null) {
  const [state, setState] = useState<StreamState>({
    text: '',
    status: 'idle',
    error: null,
    errorStatus: undefined,
  })

  const start = useCallback(
    async (systemPrompt: string, userContent: string) => {
      if (!provider) return
      setState({ text: '', status: 'loading', error: null, errorStatus: undefined })

      try {
        const gen = provider.stream(systemPrompt, userContent)
        let started = false

        for await (const chunk of gen) {
          if (!started) {
            started = true
            setState((s) => ({ ...s, status: 'streaming' }))
          }
          setState((s) => ({ ...s, text: s.text + chunk }))
        }

        setState((s) => ({ ...s, status: 'done' }))
      } catch (err) {
        if (err instanceof ProviderError) {
          setState((s) => ({
            ...s,
            status: 'error',
            error: err.message,
            errorStatus: err.status,
          }))
        } else {
          setState((s) => ({
            ...s,
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
            errorStatus: undefined,
          }))
        }
      }
    },
    [provider]
  )

  return { ...state, start }
}
