import '@testing-library/jest-dom'

const mockStorage: Record<string, Record<string, unknown>> = {
  local: {},
  session: {},
}

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string | string[]) => {
        const ks = Array.isArray(keys) ? keys : [keys]
        return Promise.resolve(
          Object.fromEntries(ks.map((k) => [k, mockStorage.local[k]]).filter(([, v]) => v !== undefined))
        )
      }),
      set: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorage.local, data)
        return Promise.resolve()
      }),
    },
    session: {
      get: vi.fn((keys: string | string[]) => {
        const ks = Array.isArray(keys) ? keys : [keys]
        return Promise.resolve(
          Object.fromEntries(ks.map((k) => [k, mockStorage.session[k]]).filter(([, v]) => v !== undefined))
        )
      }),
      set: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorage.session, data)
        return Promise.resolve()
      }),
    },
  },
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
  },
  tabs: {
    create: vi.fn(() => Promise.resolve({})),
  },
})

beforeEach(() => {
  mockStorage.local = {}
  mockStorage.session = {}
  vi.clearAllMocks()
})
