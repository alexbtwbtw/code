import { test, expect } from '@playwright/test'

/**
 * Task E2E tests.
 * Seed data: 89 tasks across 34 projects.
 * Project 2 "EN222/A32 Serrinha" has tasks including "Revisão do projeto de execução — traçado em planta" (in_progress).
 * App defaults to Portuguese.
 */

test.describe('Tasks', () => {
  test('navigate to a project with tasks and click a task', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Pesquisar Projetos' }).click()

    // Wait for project list to load
    await expect(page.locator('.project-card').first()).toBeVisible({ timeout: 15_000 })

    // Search for the Serrinha project (which has tasks in seed)
    const searchInput = page.locator('input[placeholder*="Pesquis"]')
    await searchInput.fill('Serrinha')
    await page.waitForTimeout(700)

    const viewBtn = page.locator('.project-card').first()
    await expect(viewBtn).toBeVisible({ timeout: 10_000 })
    await viewBtn.click()

    // Wait for project detail to load
    await page.waitForTimeout(1500)

    // The tasks section should be present (PT: "Tarefas")
    await expect(page.locator('h2', { hasText: 'Tarefas' })).toBeVisible({ timeout: 10_000 })

    // At least one task card should be visible
    const firstTask = page.locator('.task-card').first()
    await expect(firstTask).toBeVisible({ timeout: 10_000 })

    // Click the first task
    await firstTask.click()

    // Should navigate to task detail page
    await expect(page.locator('.task-detail-page')).toBeVisible({ timeout: 10_000 })
  })

  test('task detail shows title, status, and priority', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Pesquisar Projetos' }).click()
    await expect(page.locator('.project-card').first()).toBeVisible({ timeout: 15_000 })

    // Navigate to a project with known tasks — search for Serrinha
    const searchInput = page.locator('input[placeholder*="Pesquis"]')
    await searchInput.fill('Serrinha')
    await page.waitForTimeout(700)

    await page.locator('.project-card').first().click()
    await page.waitForTimeout(1500)

    await expect(page.locator('.task-card').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('.task-card').first().click()

    // Wait for task detail to load
    await page.waitForTimeout(1000)

    // Task title should be visible in the hero
    await expect(page.locator('.task-hero-title')).toBeVisible({ timeout: 10_000 })

    // Status pill should be visible
    await expect(page.locator('.status-pill').first()).toBeVisible()

    // Priority label should be visible
    await expect(page.locator('.task-priority-label').first()).toBeVisible()
  })

  test('add a comment to a task and verify it appears', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Pesquisar Projetos' }).click()
    await expect(page.locator('.project-card').first()).toBeVisible({ timeout: 15_000 })

    // Navigate to a project and open a task
    const searchInput = page.locator('input[placeholder*="Pesquis"]')
    await searchInput.fill('Serrinha')
    await page.waitForTimeout(700)

    await page.locator('.project-card').first().click()
    await page.waitForTimeout(1500)

    await expect(page.locator('.task-card').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('.task-card').first().click()
    await page.waitForTimeout(1000)

    // Wait for comment section — PT label "Adicionar Comentário"
    await expect(page.locator('.task-comment-form')).toBeVisible({ timeout: 10_000 })

    // Fill the author name field (PT placeholder: "O Seu Nome")
    const authorInput = page.locator('.task-comment-form input[placeholder*="Nome"]')
    await authorInput.fill('E2E Test User')

    // Fill the comment text area (PT placeholder: "Escreva um comentário…")
    const commentInput = page.locator('.task-comment-form textarea')
    await commentInput.fill('This is an E2E test comment')

    // Submit
    await page.locator('.task-comment-form button[type="submit"]').click()

    // Wait for comment to appear in the list
    await expect(page.locator('.task-comment-body', { hasText: 'This is an E2E test comment' }).first()).toBeVisible({ timeout: 10_000 })

    // Author name should also be visible
    await expect(page.locator('.task-comment-author', { hasText: 'E2E Test User' }).first()).toBeVisible()
  })

  test('task comments section is visible on task detail', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Pesquisar Projetos' }).click()
    await expect(page.locator('.project-card').first()).toBeVisible({ timeout: 15_000 })

    const searchInput = page.locator('input[placeholder*="Pesquis"]')
    await searchInput.fill('Serrinha')
    await page.waitForTimeout(700)

    await page.locator('.project-card').first().click()
    await page.waitForTimeout(1500)

    await page.locator('.task-card').first().click()
    await page.waitForTimeout(1000)

    // PT: "Comentários"
    await expect(page.locator('h2', { hasText: 'Comentários' })).toBeVisible({ timeout: 10_000 })
  })
})
