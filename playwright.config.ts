import { defineConfig } from '@playwright/test'
import path from 'path'

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
          ],
        },
      },
    },
  ],
})
