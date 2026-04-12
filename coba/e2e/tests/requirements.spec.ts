import { test, expect } from '@playwright/test'

/**
 * Requirements E2E tests.
 * Seed data: 3 requirement books:
 *   1. "Livro de Encargos — Ponte Vasco da Gama" (4 requirements)
 *   2. "Caderno de Encargos — Abastecimento de Água Luanda Norte" (4 requirements)
 *   3. "Livro de Encargos — Expansão do Aeroporto Julius Nyerere" (4 requirements)
 * App defaults to Portuguese.
 */

test.describe('Requirements', () => {
  test('requirements list shows seed books', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Livros de Encargos' }).click()

    // Wait for books to load — the seed book cards should appear
    await expect(page.locator('.req-book-card').first()).toBeVisible({ timeout: 15_000 })
  })

  test('requirements list shows Ponte Vasco da Gama book', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Livros de Encargos' }).click()

    await expect(page.locator('.req-book-title').filter({ hasText: 'Ponte Vasco da Gama' }).first()).toBeVisible({ timeout: 15_000 })
  })

  test('clicking a book navigates to its detail page with requirements', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Livros de Encargos' }).click()
    await expect(page.locator('.req-book-card').first()).toBeVisible({ timeout: 15_000 })

    // Click the first book card
    await page.locator('.req-book-card').first().click()

    // Breadcrumb should appear
    await expect(page.locator('.breadcrumb-bar')).toBeVisible({ timeout: 10_000 })

    // The requirements section heading should be visible (PT: "Requisitos")
    await expect(page.locator('h2', { hasText: 'Requisitos' })).toBeVisible({ timeout: 10_000 })

    // At least one requirement item should be visible (seed has 4 per book)
    await expect(page.locator('.req-item-card').first()).toBeVisible({ timeout: 10_000 })
  })

  test('add a new requirement: fill form, save, verify it appears', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Livros de Encargos' }).click()
    await expect(page.locator('.req-book-card').first()).toBeVisible({ timeout: 15_000 })

    // Open the first book (Ponte Vasco da Gama)
    await page.locator('.req-book-card').first().click()
    await expect(page.locator('.req-item-card').first()).toBeVisible({ timeout: 10_000 })

    // Click "+ Adicionar Requisito"
    await page.locator('button', { hasText: 'Adicionar Requisito' }).click()

    // Fill the "Título do Requisito" field
    const reqTitle = `E2E Test Requirement ${Date.now()}`
    await page.locator('.req-form-card .field', { hasText: 'Título do Requisito' }).locator('input').fill(reqTitle)

    // Submit the form — button says "Guardar"
    await page.locator('.req-form-card button[type="submit"]').click()

    // Wait for the new requirement to appear in the list
    await expect(page.locator(`.req-item-title:text-is("${reqTitle}")`)).toBeVisible({ timeout: 10_000 })
  })

  test('Find Matches button opens the match panel', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Livros de Encargos' }).click()
    await expect(page.locator('.req-book-card').first()).toBeVisible({ timeout: 15_000 })

    // Open the first book
    await page.locator('.req-book-card').first().click()
    await expect(page.locator('.req-item-card').first()).toBeVisible({ timeout: 10_000 })

    // Click the "Encontrar Correspondências" button on the first requirement
    const matchBtn = page.locator('.req-match-btn').first()
    await expect(matchBtn).toBeVisible({ timeout: 10_000 })
    await matchBtn.click()

    // The match panel should now be visible
    await expect(page.locator('.req-match-panel, .suggest-panel').first()).toBeVisible({ timeout: 10_000 })

    // The "Encontrar Correspondências" submit button inside the panel should be present
    await expect(page.locator('.req-match-panel button', { hasText: 'Encontrar Correspondências' })).toBeVisible({ timeout: 5_000 })
  })
})
