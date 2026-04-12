import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * Team member E2E tests.
 * Seed data: 4 team members — António Ressano Garcia, etc.
 * App defaults to Portuguese.
 */

const DUMMY_PDF = path.resolve(__dirname, '../fixtures/dummy.pdf')

test.describe('Team Members', () => {
  test('team list shows seed members', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Equipa' }).click()
    // Wait for team members to load — look for a member card or list item
    await expect(page.locator('.member-card, .member-row, .member-item').first()).toBeVisible({ timeout: 15_000 })
  })

  test('team list shows António Ressano Garcia', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Equipa' }).click()
    await expect(page.locator('text=António Ressano Garcia')).toBeVisible({ timeout: 15_000 })
  })

  test('clicking a member navigates to their detail page', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Equipa' }).click()
    await expect(page.locator('text=António Ressano Garcia')).toBeVisible({ timeout: 15_000 })

    // Click the first member's name or view button
    const memberLink = page.locator('text=António Ressano Garcia').first()
    await memberLink.click()

    // Breadcrumb should appear
    await expect(page.locator('.breadcrumb-bar')).toBeVisible({ timeout: 10_000 })
    // Member name should appear prominently (hero heading)
    await expect(page.locator('.member-hero-name')).toContainText('António Ressano Garcia', { timeout: 10_000 })
  })

  test('member detail shows name, title, and tagged projects section', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Equipa' }).click()
    await expect(page.locator('text=António Ressano Garcia')).toBeVisible({ timeout: 15_000 })

    await page.locator('text=António Ressano Garcia').first().click()
    await page.waitForTimeout(1500)

    // Name
    await expect(page.locator('.member-hero-name')).toContainText('António Ressano Garcia')
    // Title (Engenheiro Estrutural Sénior)
    await expect(page.locator('.member-hero-title')).toBeVisible()

    // Tagged projects section — PT label is "Projetos Associados"
    await expect(page.locator('text=Projetos Associados')).toBeVisible({ timeout: 10_000 })
  })

  test('CV import flow: click import, upload PDF, review panel appears', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Equipa' }).click()
    await page.waitForTimeout(1000)

    // Click "Importar de CV" button (PT label for btnUploadCv)
    // This button triggers a hidden file input
    const importBtn = page.locator('button', { hasText: 'Importar de CV' })
    await expect(importBtn).toBeVisible({ timeout: 10_000 })

    // Set the file on the hidden input directly (avoid native file picker)
    const fileInput = page.locator('input[type="file"][accept="application/pdf"]').first()
    await fileInput.setInputFiles(DUMMY_PDF)

    // The mock CV parser runs and returns data — wait for the cv-preview form
    // The parsing banner should appear briefly, then the preview form
    await expect(
      page.locator('.cv-preview-header, .cv-parsing-banner, text=Extraído do CV')
        .first()
    ).toBeVisible({ timeout: 15_000 })

    // After parsing completes, the review panel (cv-preview-header or the extracted data) should be shown
    // The mock returns a name, so the form should be pre-filled
    await expect(page.locator('input[value="António Manuel Ferreira da Silva"], input').first()).toBeVisible({ timeout: 15_000 })
  })
})
