export type StreamStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export type ProviderName = 'claude' | 'openai' | 'gemini'

export interface AIProvider {
  name: string
  model: string
  stream(systemPrompt: string, userContent: string): AsyncGenerator<string>
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export interface CapturedPage {
  title: string
  byline: string
  siteName: string
  content: string       // HTML from Readability
  textContent: string   // plain text from Readability
  excerpt: string
  wordCount: number
  isShort: boolean      // true when wordCount < 200
  url: string
}

export interface Settings {
  selectedProvider: ProviderName
  apiKeys: Record<ProviderName, string>
}
