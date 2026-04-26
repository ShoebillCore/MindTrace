import { createGeminiProvider } from '../../src/workspace/providers/gemini'
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

function geminiEvent(text: string): string {
  return `data: ${JSON.stringify({
    candidates: [{ content: { parts: [{ text }] } }],
  })}\n\n`
}

test('streams text from Gemini SSE response', async () => {
  const lines = [geminiEvent('Hey'), geminiEvent(' there')]
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeSseStream(lines)))

  const provider = createGeminiProvider('key')
  const chunks: string[] = []
  for await (const chunk of provider.stream('sys', 'user')) chunks.push(chunk)

  expect(chunks).toEqual(['Hey', ' there'])
})

test('sends correct URL with API key and SSE alt', async () => {
  const mockFetch = vi.fn().mockResolvedValue(makeSseStream([geminiEvent('ok')]))
  vi.stubGlobal('fetch', mockFetch)

  const provider = createGeminiProvider('my-key')
  for await (const _ of provider.stream('sys', 'user')) { /* consume */ }

  const [url, init] = mockFetch.mock.calls[0]
  expect(url).toContain('key=my-key')
  expect(url).toContain('alt=sse')
  const body = JSON.parse(init.body)
  expect(body.system_instruction.parts[0].text).toBe('sys')
  expect(body.contents[0].parts[0].text).toBe('user')
})

test('throws ProviderError on 403', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('forbidden', { status: 403 })))
  const provider = createGeminiProvider('key')
  await expect(async () => {
    for await (const _ of provider.stream('s', 'u')) { /* consume */ }
  }).rejects.toMatchObject({ status: 403 })
})
