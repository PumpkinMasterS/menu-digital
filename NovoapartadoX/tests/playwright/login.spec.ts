import { test, expect } from '@playwright/test'

test('Login page loads and form is visible', async ({ page }) => {
  await page.goto('/login')
  const form = page.locator('form.login-form')
  await expect(form).toBeVisible()
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.locator('button.btn.btn-primary')).toBeVisible()
})