import { renderHook, act, waitFor } from '@testing-library/react'
import { useStream } from '../../src/workspace/hooks/useStream'
import type { AIProvider } from '../../src/workspace/providers/types'
import { ProviderError } from '../../src/workspace/providers/types'

function makeProvider(chunks: string[]): AIProvider {
  return {
    name: 'mock',
    async *stream() {
      for (const chunk of chunks) yield chunk
    },
  }
}

test('starts idle', () => {
  const { result } = renderHook(() => useStream(makeProvider(['hi'])))
  expect(result.current.status).toBe('idle')
  expect(result.current.text).toBe('')
  expect(result.current.error).toBeNull()
  expect(result.current.errorStatus).toBeUndefined()
})

test('streams chunks and reaches done', async () => {
  const provider = makeProvider(['Hello', ' world', '!'])
  const { result } = renderHook(() => useStream(provider))

  await act(async () => {
    await result.current.start('sys', 'user')
  })

  expect(result.current.text).toBe('Hello world!')
  expect(result.current.status).toBe('done')
})

test('sets status to loading then streaming', async () => {
  const statuses: string[] = []
  let resolveChunk!: () => void
  const blocker = new Promise<void>((res) => { resolveChunk = res })

  const provider: AIProvider = {
    name: 'slow',
    async *stream() {
      yield 'first'
      await blocker
      yield 'second'
    },
  }

  const { result } = renderHook(() => useStream(provider))

  act(() => { result.current.start('sys', 'user') })
  await waitFor(() => expect(result.current.status).toBe('streaming'))
  statuses.push(result.current.status)

  await act(async () => { resolveChunk() })
  await waitFor(() => expect(result.current.status).toBe('done'))
  statuses.push(result.current.status)

  expect(statuses).toEqual(['streaming', 'done'])
})

test('handles generic error', async () => {
  const provider: AIProvider = {
    name: 'error',
    async *stream() {
      throw new Error('network failure')
    },
  }
  const { result } = renderHook(() => useStream(provider))

  await act(async () => {
    await result.current.start('sys', 'user')
  })

  expect(result.current.status).toBe('error')
  expect(result.current.error).toBe('network failure')
  expect(result.current.errorStatus).toBeUndefined()
})

test('handles ProviderError and exposes status code', async () => {
  const provider: AIProvider = {
    name: 'ratelimit',
    async *stream() {
      throw new ProviderError('Too Many Requests', 429)
    },
  }
  const { result } = renderHook(() => useStream(provider))

  await act(async () => {
    await result.current.start('sys', 'user')
  })

  expect(result.current.status).toBe('error')
  expect(result.current.errorStatus).toBe(429)
})

test('preserves partial text on stream interruption', async () => {
  const provider: AIProvider = {
    name: 'partial',
    async *stream() {
      yield 'partial content'
      throw new Error('stream cut')
    },
  }
  const { result } = renderHook(() => useStream(provider))

  await act(async () => {
    await result.current.start('sys', 'user')
  })

  expect(result.current.text).toBe('partial content')
  expect(result.current.status).toBe('error')
})

test('does nothing when provider is null', async () => {
  const { result } = renderHook(() => useStream(null))
  await act(async () => {
    await result.current.start('sys', 'user')
  })
  expect(result.current.status).toBe('idle')
})
