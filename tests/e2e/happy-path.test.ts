import { test, expect, chromium } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTENSION_PATH = path.resolve(__dirname, '../../dist')
const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/article.html')

test('MindTrace button captures article and workspace shows article content', async () => {
  // Launch Chrome with the extension loaded
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  })

  const page = await context.newPage()
  await page.goto(`file://${FIXTURE_PATH}`)

  // MindTrace button should be injected into the page
  const btn = page.locator('#mindtrace-btn')
  await expect(btn).toBeVisible({ timeout: 5000 })

  // Click the button — workspace should open as a new tab
  const [workspacePage] = await Promise.all([
    context.waitForEvent('page'),
    btn.click(),
  ])

  await workspacePage.waitForLoadState('domcontentloaded')

  // Workspace URL should be the extension page
  expect(workspacePage.url()).toContain('workspace.html')

  // Article panel should display the captured article title (proves content was stored + loaded)
  await expect(workspacePage.locator('.article-title')).toBeVisible({ timeout: 5000 })
  await expect(workspacePage.locator('.article-title')).toContainText('Deep Work')

  // Without an API key configured, the no-key prompt should mention "API key"
  await expect(workspacePage.locator('.no-key-prompt')).toContainText('API key')

  await context.close()
})

test('workspace shows navigate prompt when opened without capturing an article', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  })

  // Get the extension ID from the service worker URL
  let [worker] = context.serviceWorkers()
  if (!worker) {
    worker = await context.waitForEvent('serviceworker', { timeout: 5000 })
  }
  const extensionId = new URL(worker.url()).hostname
  const workspaceUrl = `chrome-extension://${extensionId}/src/workspace/workspace.html`

  // Load any page so we don't rely on the fixture (workspace is opened directly)
  const page = await context.newPage()

  // Open the workspace directly — no article captured
  await page.goto(workspaceUrl)
  await page.waitForLoadState('domcontentloaded')

  // Workspace should prompt the user to navigate to an article first
  await expect(page.locator('.no-key-prompt')).toBeVisible()
  await expect(page.locator('.no-key-prompt')).toContainText('Navigate to an article')

  await context.close()
})
