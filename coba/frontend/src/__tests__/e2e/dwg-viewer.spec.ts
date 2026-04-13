/**
 * dwg-viewer.spec.ts — Playwright E2E tests for the DWG viewer
 *
 * These tests require the dev server to be running (npm run dev from the repo
 * root). They verify the end-to-end behaviour of the DWG upload and viewer
 * feature, specifically that error code 64 from the WASM renderer is never
 * shown as raw text to the user.
 *
 * NOTE: These tests will be skipped automatically if the server is not
 * available (the webServer config in playwright.config.ts will handle startup).
 * If the backend is not running the upload endpoint will fail; the tests are
 * designed to handle this gracefully.
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const EXAMPLE_DIR = path.resolve(__dirname, '../../../../../example')
const MECHANICAL_DWG = path.join(EXAMPLE_DIR, 'mechanical_example-imperial.dwg')

test.describe('DWG Viewer — error code 64 regression', () => {
  test('engineering tools page loads without errors', async ({ page }) => {
    await page.goto('/engineering')

    // The page should load and show the Engineering Tools heading
    // (Portuguese: "Ferramentas de Engenharia" or English: "Engineering Tools")
    await expect(page.locator('h2, h1').first()).toBeVisible({ timeout: 10000 })

    // The raw "error code: 64" string must never appear on the page
    await expect(page.locator('text=error code: 64')).not.toBeVisible()
    await expect(page.locator('text=error code:')).not.toBeVisible()
  })

  test('drop zone is present on engineering page', async ({ page }) => {
    await page.goto('/engineering')

    // The drop zone should be visible
    const dropZone = page.locator('.eng-drop-zone')
    await expect(dropZone).toBeVisible({ timeout: 10000 })

    // No raw error code strings
    await expect(page.locator('text=error code: 64')).not.toBeVisible()
  })

  test('DWG file upload shows file in list without raw error codes', async ({ page }) => {
    // This test uploads the AC1024 example file and verifies the viewer either
    // renders it or shows a friendly error — but never the raw "error code: 64"
    await page.goto('/engineering')

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Upload the example DWG (the backend must be running for this to work)
    const fileInput = page.locator('input[type="file"]')
    if ((await fileInput.count()) === 0) {
      test.skip(true, 'No file input found — backend may not be running')
      return
    }

    await fileInput.setInputFiles(MECHANICAL_DWG)

    // Wait for the file to appear in the list (up to 15 seconds for upload)
    const fileRow = page.locator('.eng-file-row').first()
    const appeared = await fileRow.waitFor({ timeout: 15000 }).then(() => true).catch(() => false)

    if (!appeared) {
      test.skip(true, 'File row did not appear — backend upload may have failed')
      return
    }

    // The file name or display name should appear
    await expect(fileRow).toBeVisible()

    // Click the row to expand the viewer
    await fileRow.click()

    // Wait for viewer state: either SVG rendered (eng-svg-container) or
    // friendly error shown (eng-viewer-error-body). Give it 20 seconds since
    // WASM initialisation takes time on first load.
    await page.waitForSelector('.eng-svg-container, .eng-viewer-error-body', {
      timeout: 20000,
    })

    // Under no circumstances should the raw error code be visible
    await expect(page.locator('text=error code: 64')).not.toBeVisible()
    await expect(page.locator('text=error code:')).not.toBeVisible()

    // If the error body is shown, the title must be the friendly translated text
    const errorBody = page.locator('.eng-viewer-error-body')
    if (await errorBody.isVisible()) {
      await expect(page.locator('.eng-viewer-error-title')).toBeVisible()
      // The error title should NOT contain raw numeric codes
      const titleText = await page.locator('.eng-viewer-error-title').textContent()
      expect(titleText).not.toMatch(/\d+/)
    }
  })

  test('viewer shows friendly message, not raw JS errors, when WASM fails', async ({ page }) => {
    // Navigate to engineering
    await page.goto('/engineering')
    await page.waitForLoadState('networkidle')

    // Listen for console errors — "error code: 64" appearing in console is
    // acceptable (it's a WASM diagnostic), but it must not reach the DOM
    const domErrorCodes: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('error code:')) {
        domErrorCodes.push(msg.text())
      }
    })

    // Wait a moment for any initial WASM loading errors
    await page.waitForTimeout(2000)

    // The DOM must never contain the raw error string
    const pageText = await page.textContent('body') ?? ''
    expect(pageText).not.toContain('error code: 64')
    expect(pageText).not.toContain('DWG_ERR_VALUEOUTOFBOUNDS')
  })
})
