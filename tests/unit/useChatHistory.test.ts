import { renderHook, act } from '@testing-library/react'
import { useChatHistory } from '../../src/workspace/hooks/useChatHistory'

test('starts with empty messages', () => {
  const { result } = renderHook(() => useChatHistory())
  expect(result.current.messages).toEqual([])
})

test('addUserMessage appends a user bubble and returns its id', () => {
  const { result } = renderHook(() => useChatHistory())
  let id!: string
  act(() => { id = result.current.addUserMessage('hello') })
  expect(result.current.messages).toHaveLength(1)
  expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'hello' })
  expect(result.current.messages[0].id).toBe(id)
})

test('addAssistantMessage appends a streaming assistant bubble with label', () => {
  const { result } = renderHook(() => useChatHistory())
  act(() => { result.current.addAssistantMessage('Summary') })
  expect(result.current.messages).toHaveLength(1)
  expect(result.current.messages[0]).toMatchObject({
    role: 'assistant',
    content: '',
    label: 'Summary',
    isStreaming: true,
  })
})

test('updateMessage sets content on the target message', () => {
  const { result } = renderHook(() => useChatHistory())
  let id!: string
  act(() => { id = result.current.addAssistantMessage() })
  act(() => { result.current.updateMessage(id, 'partial text') })
  expect(result.current.messages[0].content).toBe('partial text')
})

test('finalizeMessage clears isStreaming', () => {
  const { result } = renderHook(() => useChatHistory())
  let id!: string
  act(() => { id = result.current.addAssistantMessage() })
  act(() => {
    result.current.updateMessage(id, 'full text')
    result.current.finalizeMessage(id)
  })
  expect(result.current.messages[0].isStreaming).toBe(false)
  expect(result.current.messages[0].content).toBe('full text')
})

test('setStreamingError sets error content and clears isStreaming', () => {
  const { result } = renderHook(() => useChatHistory())
  let id!: string
  act(() => { id = result.current.addAssistantMessage() })
  act(() => { result.current.setStreamingError(id, 'rate limited') })
  expect(result.current.messages[0].content).toBe('rate limited')
  expect(result.current.messages[0].isStreaming).toBe(false)
})

test('messages from different calls are ordered correctly', () => {
  const { result } = renderHook(() => useChatHistory())
  act(() => {
    result.current.addUserMessage('q1')
    result.current.addAssistantMessage()
    result.current.addUserMessage('q2')
  })
  expect(result.current.messages).toHaveLength(3)
  expect(result.current.messages[0].role).toBe('user')
  expect(result.current.messages[1].role).toBe('assistant')
  expect(result.current.messages[2].role).toBe('user')
})
