import { useState, useCallback, useRef } from 'react'
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
  const runIdRef = useRef(0)

  const start = useCallback(
    async (systemPrompt: string, userContent: string) => {
      if (!provider) return
      const runId = ++runIdRef.current
      setState({ text: '', status: 'loading', error: null, errorStatus: undefined })

      try {
        const gen = provider.stream(systemPrompt, userContent)
        let started = false

        for await (const chunk of gen) {
          if (runId !== runIdRef.current) return
          if (!started) {
            started = true
            setState((s) => ({ ...s, status: 'streaming' }))
          }
          setState((s) => ({ ...s, text: s.text + chunk }))
        }

        if (runId !== runIdRef.current) return
        setState((s) => ({ ...s, status: 'done' }))
      } catch (err) {
        if (runId !== runIdRef.current) return
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
