import { createOpenAIProvider } from '../../src/workspace/providers/openai'
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

function openaiEvent(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
}

test('streams text from OpenAI SSE response', async () => {
  const lines = [openaiEvent('Hi'), openaiEvent(' there'), 'data: [DONE]\n\n']
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSseStream(lines)))

  const provider = createOpenAIProvider('key')
  const chunks: string[] = []
  for await (const chunk of provider.stream('sys', 'user')) {
    chunks.push(chunk)
  }

  expect(chunks).toEqual(['Hi', ' there'])
})

test('sends correct headers and body to OpenAI API', async () => {
  const mockFetch = vi.fn().mockResolvedValue(makeSseStream([openaiEvent('ok'), 'data: [DONE]\n\n']))
  vi.stubGlobal('fetch', mockFetch)

  const provider = createOpenAIProvider('my-key')
  for await (const _ of provider.stream('sys', 'user')) { /* consume */ }

  const [url, init] = mockFetch.mock.calls[0]
  expect(url).toBe('https://api.openai.com/v1/chat/completions')
  expect(init.headers['Authorization']).toBe('Bearer my-key')
  const body = JSON.parse(init.body)
  expect(body.stream).toBe(true)
  expect(body.messages[0].role).toBe('system')
  expect(body.messages[1].role).toBe('user')
})

test('throws ProviderError on 429', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('rate limit', { status: 429 })))
  const provider = createOpenAIProvider('key')
  await expect(async () => {
    for await (const _ of provider.stream('s', 'u')) { /* consume */ }
  }).rejects.toMatchObject({ status: 429 })
})
