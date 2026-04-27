import { renderHook, act, waitFor } from '@testing-library/react'
import { useHighlights } from '../../src/workspace/hooks/useHighlights'

const URL_A = 'https://example.com/article-a'
const URL_B = 'https://example.com/article-b'

test('returns empty array when no highlights in storage', async () => {
  const { result } = renderHook(() => useHighlights(URL_A))
  await waitFor(() => expect(result.current.highlights).toEqual([]))
})

test('loads highlights for current URL only', async () => {
  await chrome.storage.local.set({
    highlights: [
      { id: '1', url: URL_A, quote: 'hello', color: 'yellow' },
      { id: '2', url: URL_B, quote: 'world', color: 'green' },
    ],
  })
  const { result } = renderHook(() => useHighlights(URL_A))
  await waitFor(() => expect(result.current.highlights).toHaveLength(1))
  expect(result.current.highlights[0]).toMatchObject({ url: URL_A, quote: 'hello', color: 'yellow' })
})

test('addHighlight updates state and calls storage.set', async () => {
  const { result } = renderHook(() => useHighlights(URL_A))
  await waitFor(() => expect(result.current.highlights).toEqual([]))

  act(() => result.current.addHighlight('some text', 'blue'))

  await waitFor(() => expect(chrome.storage.local.set).toHaveBeenCalled())
  expect(result.current.highlights).toHaveLength(1)
  expect(result.current.highlights[0]).toMatchObject({ url: URL_A, quote: 'some text', color: 'blue' })
})

test('updateHighlight changes color in state', async () => {
  await chrome.storage.local.set({
    highlights: [{ id: '1', url: URL_A, quote: 'text', color: 'yellow' }],
  })
  const { result } = renderHook(() => useHighlights(URL_A))
  await waitFor(() => expect(result.current.highlights).toHaveLength(1))

  act(() => result.current.updateHighlight('1', 'pink'))

  expect(result.current.highlights[0].color).toBe('pink')
})

test('removeHighlight removes entry from state', async () => {
  await chrome.storage.local.set({
    highlights: [{ id: '1', url: URL_A, quote: 'text', color: 'yellow' }],
  })
  const { result } = renderHook(() => useHighlights(URL_A))
  await waitFor(() => expect(result.current.highlights).toHaveLength(1))

  act(() => result.current.removeHighlight('1'))

  expect(result.current.highlights).toHaveLength(0)
})

test('preserves highlights for other URLs when mutating', async () => {
  await chrome.storage.local.set({
    highlights: [{ id: '99', url: URL_B, quote: 'other', color: 'green' }],
  })
  const { result } = renderHook(() => useHighlights(URL_A))
  await waitFor(() => expect(result.current.highlights).toHaveLength(0))

  act(() => result.current.addHighlight('new', 'purple'))

  await waitFor(() => {
    const lastSetCall = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock.calls.at(-1)
    const saved = lastSetCall?.[0]?.highlights ?? []
    expect(saved.some((h: { url: string }) => h.url === URL_B)).toBe(true)
  })
})
