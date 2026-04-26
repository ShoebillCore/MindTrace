import { test, expect, chromium } from '@playwright/test'
import path from 'path'

const EXTENSION_PATH = path.resolve(__dirname, '../../dist')
const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/article.html')

test('MindTrace button appears and workspace opens with all three sections', async () => {
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

  // Article panel should be visible
  await expect(workspacePage.locator('.article-panel')).toBeVisible()

  // All three AI section cards should be present
  await expect(workspacePage.locator('.section-card').nth(0)).toBeVisible()
  await expect(workspacePage.locator('.section-card').nth(1)).toBeVisible()
  await expect(workspacePage.locator('.section-card').nth(2)).toBeVisible()

  // Section labels should show correct content
  await expect(workspacePage.locator('.section-label').nth(0)).toContainText('Summary')
  await expect(workspacePage.locator('.section-label').nth(1)).toContainText('Questions')
  await expect(workspacePage.locator('.section-label').nth(2)).toContainText('Insights')

  await context.close()
})

test('shows no-key prompt when API key is not set', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  })

  const page = await context.newPage()
  await page.goto(`file://${FIXTURE_PATH}`)

  const btn = page.locator('#mindtrace-btn')
  await expect(btn).toBeVisible()

  const [workspacePage] = await Promise.all([
    context.waitForEvent('page'),
    btn.click(),
  ])

  await workspacePage.waitForLoadState('domcontentloaded')

  // With no API key set, workspace shows the settings prompt
  await expect(workspacePage.locator('.no-key-prompt')).toBeVisible()
  await expect(workspacePage.locator('.no-key-prompt')).toContainText('API key')

  await context.close()
})
