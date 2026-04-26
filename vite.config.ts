import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import webExtension from 'vite-plugin-web-extension'

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: 'manifest.json',
      additionalInputs: ['src/workspace/workspace.html'],
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
})
