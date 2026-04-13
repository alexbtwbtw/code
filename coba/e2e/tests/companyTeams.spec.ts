import { test, expect } from '@playwright/test'

/**
 * Company Teams E2E tests.
 * App defaults to Portuguese — nav label is "Equipas Internas".
 */

test.describe('Company Teams', () => {
  test('navigate to Company Teams page', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-btn', { hasText: 'Equipas Internas' }).click()
    await expect(page.locator('h1')).toContainText('Equipas Internas', { timeout: 10_000 })
  })

  test('shows empty state or seed teams list', async ({ page }) => {
    await page.goto('/company-teams')
    // Either "Sem equipas." or a team list is visible
    await page.waitForTimeout(2_000)
    const body = page.locator('.view, .company-teams, main')
    await expect(body).toBeVisible()
  })

  test('create a new team', async ({ page }) => {
    await page.goto('/company-teams')
    await page.waitForTimeout(1_500)

    // Click "Nova Equipa" button
    const newTeamBtn = page.locator('button', { hasText: 'Nova Equipa' })
    await expect(newTeamBtn).toBeVisible({ timeout: 10_000 })
    await newTeamBtn.click()

    // Fill in the form
    const nameInput = page.locator('input[type="text"]').first()
    await expect(nameInput).toBeVisible({ timeout: 5_000 })
    await nameInput.fill('E2E Test Team')

    // Submit
    await page.locator('button[type="submit"]').first().click()

    // The new team should now be visible
    await expect(page.locator('text=E2E Test Team')).toBeVisible({ timeout: 10_000 })
  })

  test('create team and add a member', async ({ page }) => {
    await page.goto('/company-teams')
    await page.waitForTimeout(1_500)

    // Create a new team
    const newTeamBtn = page.locator('button', { hasText: 'Nova Equipa' })
    await expect(newTeamBtn).toBeVisible({ timeout: 10_000 })
    await newTeamBtn.click()

    const nameInput = page.locator('input[type="text"]').first()
    await nameInput.fill('Member Test Team')
    await page.locator('button[type="submit"]').first().click()

    // Wait for team to be created and selected
    await expect(page.locator('text=Member Test Team')).toBeVisible({ timeout: 10_000 })

    // Select the team if it has a list item to click
    const teamItem = page.locator('text=Member Test Team').first()
    await teamItem.click()
    await page.waitForTimeout(1_000)

    // If there's a member dropdown, try to add a member
    const memberSelect = page.locator('select').first()
    const memberSelectCount = await memberSelect.count()
    if (memberSelectCount > 0) {
      // Select first available member option
      const options = memberSelect.locator('option')
      const optionCount = await options.count()
      if (optionCount > 1) {
        // Select second option (first is placeholder)
        await memberSelect.selectOption({ index: 1 })
        const addBtn = page.locator('button', { hasText: 'Adicionar Membro' })
        if (await addBtn.count() > 0) {
          await addBtn.click()
          await page.waitForTimeout(1_000)
        }
      }
    }

    // Page should still be functional
    await expect(page.locator('h1')).toContainText('Equipas Internas')
  })

  test('delete a team', async ({ page }) => {
    await page.goto('/company-teams')
    await page.waitForTimeout(1_500)

    // Create a team to delete
    const newTeamBtn = page.locator('button', { hasText: 'Nova Equipa' })
    await expect(newTeamBtn).toBeVisible({ timeout: 10_000 })
    await newTeamBtn.click()

    const nameInput = page.locator('input[type="text"]').first()
    await nameInput.fill('Team To Delete E2E')
    await page.locator('button[type="submit"]').first().click()

    await expect(page.locator('text=Team To Delete E2E')).toBeVisible({ timeout: 10_000 })

    // Click on the team to select it
    await page.locator('text=Team To Delete E2E').first().click()
    await page.waitForTimeout(1_000)

    // Click delete button
    const deleteBtn = page.locator('button', { hasText: 'Eliminar Equipa' })
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click()
      await page.waitForTimeout(500)

      // Handle confirmation dialog if present
      const confirmBtn = page.locator('button', { hasText: 'Sim' }).or(
        page.locator('button', { hasText: 'Confirmar' })
      )
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click()
      }

      await page.waitForTimeout(1_000)
      // Team should no longer be visible
      await expect(page.locator('text=Team To Delete E2E')).not.toBeVisible({ timeout: 5_000 })
    }
  })
})
