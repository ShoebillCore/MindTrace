import type { AIProvider } from './types'
import { ProviderError } from './types'

export function createGeminiProvider(apiKey: string): AIProvider {
  return {
    name: 'Gemini',
    async *stream(systemPrompt: string, userContent: string) {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent` +
        `?key=${apiKey}&alt=sse`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
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
          if (!data) continue
          try {
            const event = JSON.parse(data)
            const text: string | undefined =
              event.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) yield text
          } catch {
            // skip malformed lines
          }
        }
      }
    },
  }
}
