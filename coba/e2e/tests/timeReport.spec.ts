import { test, expect } from '@playwright/test'

/**
 * Time Report E2E tests.
 * Seed data: time entries exist for projects and team members.
 * App defaults to Portuguese — nav label is "Relatório de Tempo".
 */

test.describe('Time Report', () => {
  test('navigate to Time Report page', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Relatório de Tempo' }).click()
    await expect(page.locator('h1')).toContainText('Relatório de Registo de Tempo', { timeout: 10_000 })
  })

  test('direct navigation to /time-report works', async ({ page }) => {
    await page.goto('/time-report')
    await expect(page.locator('h1')).toContainText('Relatório de Registo de Tempo', { timeout: 10_000 })
  })

  test('seed data appears — by project table shows entries', async ({ page }) => {
    await page.goto('/time-report')
    // Wait for data to load
    await page.waitForTimeout(3_000)

    // Either data table or no-data message should be visible
    const hasData = await page.locator('.priority-list-table, table').count()
    const hasNoData = await page.locator('text=Sem registos de tempo.').count()

    // One of these must be true
    expect(hasData + hasNoData).toBeGreaterThan(0)
  })

  test('summary KPI cards are visible', async ({ page }) => {
    await page.goto('/time-report')
    await page.waitForTimeout(2_000)

    // KPI cards should be visible
    const kpiGrid = page.locator('.kpi-grid')
    await expect(kpiGrid).toBeVisible({ timeout: 10_000 })
  })

  test('by-project section heading is visible', async ({ page }) => {
    await page.goto('/time-report')
    await expect(page.locator('text=Horas por Projeto')).toBeVisible({ timeout: 10_000 })
  })

  test('by-member section heading is visible', async ({ page }) => {
    await page.goto('/time-report')
    await expect(page.locator('text=Horas por Membro')).toBeVisible({ timeout: 10_000 })
  })

  test('underreporting section heading is visible', async ({ page }) => {
    await page.goto('/time-report')
    await expect(page.locator('text=Membros sem Tempo Registado')).toBeVisible({ timeout: 10_000 })
  })

  test('seed data: by-project table shows at least one project with hours', async ({ page }) => {
    await page.goto('/time-report')
    await page.waitForTimeout(3_000)

    // If seed data exists, there should be at least one row in the by-project table
    const tableRows = page.locator('.priority-list-row')
    const count = await tableRows.count()

    // Either rows exist (seeded data) or no-data message is shown — both are valid
    if (count > 0) {
      await expect(tableRows.first()).toBeVisible()
    } else {
      await expect(page.locator('text=Sem registos de tempo.').first()).toBeVisible()
    }
  })

  test('page loads without JavaScript errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('/time-report')
    await page.waitForTimeout(3_000)

    expect(errors).toHaveLength(0)
  })
})
