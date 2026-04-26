import { renderHook, act, waitFor } from '@testing-library/react'
import { useSettings } from '../../src/workspace/hooks/useSettings'

test('returns default settings when storage is empty', async () => {
  const { result } = renderHook(() => useSettings())
  await waitFor(() => expect(result.current.loaded).toBe(true))

  expect(result.current.settings.selectedProvider).toBe('claude')
  expect(result.current.settings.apiKeys.claude).toBe('')
  expect(result.current.settings.apiKeys.openai).toBe('')
  expect(result.current.settings.apiKeys.gemini).toBe('')
})

test('loads saved provider selection from storage', async () => {
  // Pre-populate storage via chrome mock
  await chrome.storage.local.set({ selectedProvider: 'openai' })

  const { result } = renderHook(() => useSettings())
  await waitFor(() => expect(result.current.loaded).toBe(true))

  expect(result.current.settings.selectedProvider).toBe('openai')
})

test('saves provider selection to storage', async () => {
  const { result } = renderHook(() => useSettings())
  await waitFor(() => expect(result.current.loaded).toBe(true))

  act(() => result.current.saveSettings({ selectedProvider: 'gemini' }))

  expect(result.current.settings.selectedProvider).toBe('gemini')
  expect(chrome.storage.local.set).toHaveBeenCalledWith(
    expect.objectContaining({ selectedProvider: 'gemini' })
  )
})

test('saves API key to storage', async () => {
  const { result } = renderHook(() => useSettings())
  await waitFor(() => expect(result.current.loaded).toBe(true))

  act(() =>
    result.current.saveSettings({
      apiKeys: { claude: 'sk-ant-123', openai: '', gemini: '' },
    })
  )

  expect(result.current.settings.apiKeys.claude).toBe('sk-ant-123')
})
