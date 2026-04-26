import type { AIProvider } from './types'
import { ProviderError } from './types'

export function createClaudeProvider(apiKey: string): AIProvider {
  return {
    name: 'Claude',
    async *stream(systemPrompt: string, userContent: string) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new ProviderError(text, response.status)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          try {
            const event = JSON.parse(data)
            if (
              event.type === 'content_block_delta' &&
              event.delta?.type === 'text_delta'
            ) {
              yield event.delta.text as string
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    },
  }
}
