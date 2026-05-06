import type { AIProvider } from './types'
import { ProviderError } from './types'

export function createDeepseekProvider(apiKey: string, model: string): AIProvider {
  return {
    name: 'Deepseek',
    model,
    async *stream(systemPrompt: string, userContent: string) {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
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
          if (data === '[DONE]') return
          try {
            const event = JSON.parse(data)
            const content: string | undefined = event.choices?.[0]?.delta?.content
            if (content) yield content
          } catch {
            // skip malformed lines
          }
        }
      }
    },
  }
}
