import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.resolve(__dirname, 'dist')

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    headless: false,
  },
  projects: [
    {
      name: 'chrome-extension',
      use: {
        launchOptions: {
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--disable-popup-blocking',
          ],
        },
      },
    },
  ],
})
