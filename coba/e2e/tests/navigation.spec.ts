import { test, expect } from '@playwright/test'

/**
 * Navigation tests — app loads, nav links work, language toggle works.
 * All tests start from / and use UI clicks only.
 */

test.describe('Navigation', () => {
  test('app loads and shows the home/projects page', async ({ page }) => {
    await page.goto('/')
    // The brand logo should always be present
    await expect(page.locator('.topbar-brand')).toBeVisible()
    // The COBA brand text should be visible
    await expect(page.locator('.brand-logo')).toContainText('COBA')
  })

  test('nav link — Pesquisar Projetos (Search Projects)', async ({ page }) => {
    await page.goto('/')
    // Click the search nav button (Portuguese label by default)
    await page.locator('.nav-btn', { hasText: 'Pesquisar Projetos' }).click()
    // Should render the search page header
    await expect(page.locator('h1')).toContainText('Pesquisar Projetos')
  })

  test('nav link — Equipa (Team)', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Equipa' }).click()
    await expect(page.locator('h1')).toContainText('Membros')
  })

  test('nav link — Livros de Encargos (Requirements)', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Livros de Encargos' }).click()
    await expect(page.locator('h1')).toContainText('Livros de Encargos')
  })

  test('nav link — Relatórios (Reports)', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Relatórios' }).click()
    await expect(page.locator('h1')).toContainText('Relatórios')
  })

  test('language toggle switches from PT to EN', async ({ page }) => {
    await page.goto('/')
    // Default language is PT — lang button shows "EN"
    const langBtn = page.locator('.lang-btn')
    await expect(langBtn).toContainText('EN')

    // Navigate to search so we can check a known label change
    await page.locator('.nav-btn', { hasText: 'Pesquisar Projetos' }).click()
    await expect(page.locator('h1')).toContainText('Pesquisar Projetos')

    // Switch to EN
    await langBtn.click()
    // Button should now show "PT"
    await expect(langBtn).toContainText('PT')

    // The same nav button should now be in English
    await expect(page.locator('.nav-btn', { hasText: 'Search Projects' })).toBeVisible()
    await expect(page.locator('h1')).toContainText('Search Projects')
  })

  test('language toggle switches from EN back to PT', async ({ page }) => {
    await page.goto('/')
    const langBtn = page.locator('.lang-btn')

    // Switch to EN first
    await langBtn.click()
    await expect(langBtn).toContainText('PT')

    // Switch back to PT
    await langBtn.click()
    await expect(langBtn).toContainText('EN')

    // Verify a PT-only label is visible (nav label for team)
    await expect(page.locator('.nav-btn', { hasText: 'Equipa' })).toBeVisible()
  })
})
