import { createClaudeProvider } from '../../src/workspace/providers/claude'
import { ProviderError } from '../../src/workspace/providers/types'

function makeSseStream(lines: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line))
      }
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

function claudeEvent(text: string): string {
  return `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`
}

test('streams text from Claude SSE response', async () => {
  const lines = [claudeEvent('Hello'), claudeEvent(' world'), 'data: {"type":"message_stop"}\n\n']
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSseStream(lines)))

  const provider = createClaudeProvider('test-key')
  const chunks: string[] = []
  for await (const chunk of provider.stream('sys', 'user')) {
    chunks.push(chunk)
  }

  expect(chunks).toEqual(['Hello', ' world'])
})

test('sends correct headers and body to Anthropic API', async () => {
  const mockFetch = vi.fn().mockResolvedValue(makeSseStream([claudeEvent('ok')]))
  vi.stubGlobal('fetch', mockFetch)

  const provider = createClaudeProvider('my-key')
  for await (const _ of provider.stream('system prompt', 'user content')) { /* consume */ }

  const [url, init] = mockFetch.mock.calls[0]
  expect(url).toBe('https://api.anthropic.com/v1/messages')
  expect(init.headers['x-api-key']).toBe('my-key')
  expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true')
  const body = JSON.parse(init.body)
  expect(body.stream).toBe(true)
  expect(body.system).toBe('system prompt')
  expect(body.messages[0].content).toBe('user content')
})

test('throws ProviderError with status 429 on rate limit', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('rate limited', { status: 429 })))

  const provider = createClaudeProvider('key')
  await expect(async () => {
    for await (const _ of provider.stream('s', 'u')) { /* consume */ }
  }).rejects.toMatchObject({ status: 429 })
})

test('throws ProviderError with status 401 on invalid key', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 })))

  const provider = createClaudeProvider('bad-key')
  await expect(async () => {
    for await (const _ of provider.stream('s', 'u')) { /* consume */ }
  }).rejects.toBeInstanceOf(ProviderError)
})
