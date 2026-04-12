import { test, expect } from '@playwright/test'

/**
 * Project-related E2E tests.
 * Seed data: 34 projects. First project: "4ème Rocade d'Alger".
 * App defaults to Portuguese.
 */

test.describe('Projects list', () => {
  test('search page shows seed project cards', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Pesquisar Projetos' }).click()
    // Wait for project data to load — at least one row/card visible
    await expect(page.locator('.project-card').first()).toBeVisible({ timeout: 15_000 })
  })

  test('search input filters the list', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Pesquisar Projetos' }).click()

    // Wait for list to populate
    await expect(page.locator('.project-card').first()).toBeVisible({ timeout: 15_000 })

    const searchInput = page.locator('input[placeholder*="Pesquis"]')
    await searchInput.fill('Rocade')

    // Debounce — wait briefly
    await page.waitForTimeout(700)

    // The Alger project should still be visible
    await expect(page.locator('.project-card').first()).toBeVisible({ timeout: 5_000 })
  })

  test('search for non-existent term shows no results message', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Pesquisar Projetos' }).click()
    await expect(page.locator('.project-card').first()).toBeVisible({ timeout: 15_000 })

    const searchInput = page.locator('input[placeholder*="Pesquis"]')
    await searchInput.fill('xyzzy_nonexistent_project_12345')
    await page.waitForTimeout(700)

    // PT no-results label
    await expect(page.locator('text=Nenhum projeto encontrado.')).toBeVisible({ timeout: 5_000 })
  })

  test('clicking a project navigates to its detail page', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Pesquisar Projetos' }).click()

    const firstViewBtn = page.locator('.project-card').first()
    await expect(firstViewBtn).toBeVisible({ timeout: 15_000 })
    await firstViewBtn.click()

    // Breadcrumb bar should appear on detail pages
    await expect(page.locator('.breadcrumb-bar')).toBeVisible({ timeout: 10_000 })
  })

  test('project detail shows status and at least one section heading', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Pesquisar Projetos' }).click()

    const firstViewBtn = page.locator('.project-card').first()
    await expect(firstViewBtn).toBeVisible({ timeout: 15_000 })
    await firstViewBtn.click()

    // Wait for project data to load
    await page.waitForTimeout(2000)

    // Status values in PT
    const statusLocator = page.locator(
      'text=Concluído, text=Ativo, text=Planeamento, text=Suspenso, text=Cancelado'
    )
    // Use broader search — the status badge/text should exist somewhere
    const statusFound = await page.locator('body').textContent()
    const ptStatuses = ['Concluído', 'Ativo', 'Planeamento', 'Suspenso', 'Cancelado']
    const hasStatus = ptStatuses.some(s => statusFound?.includes(s))
    expect(hasStatus).toBeTruthy()

    // At least one section (geo, structures, team, tasks) should exist
    const sectionText = await page.locator('body').textContent()
    const ptSections = ['Registos Geológicos', 'Estruturas', 'Equipa', 'Tarefas', 'Funcionalidades']
    const hasSection = ptSections.some(s => sectionText?.includes(s))
    expect(hasSection).toBeTruthy()
  })

  test('create a new project and verify it appears in the list', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Adicionar Projeto' }).click()
    await page.waitForTimeout(500)

    const refCode = `E2E-${Date.now()}`
    const projectName = `E2E Test Project ${Date.now()}`

    // Fill "Código de Referência" field — label text in PT
    const refField = page.locator('.field', { hasText: 'Código de Referência' }).locator('input')
    await refField.fill(refCode)

    // Fill "Nome do Projeto" field
    const nameField = page.locator('.field', { hasText: 'Nome do Projeto' }).locator('input')
    await nameField.fill(projectName)

    // Submit the form
    await page.locator('button[type="submit"]').click()

    // Wait for success message
    await expect(page.locator('text=Projeto criado com sucesso!')).toBeVisible({ timeout: 10_000 })

    // Navigate to search
    await page.locator('.nav-btn', { hasText: 'Pesquisar Projetos' }).click()
    await page.waitForTimeout(1500)

    // Search for the new project by ref code
    const searchInput = page.locator('input[placeholder*="Pesquis"]')
    await searchInput.fill(refCode)
    await page.waitForTimeout(700)

    // Should find at least one result
    await expect(page.locator('.project-card').first()).toBeVisible({ timeout: 10_000 })
  })
})
