import { test, expect } from '@playwright/test'

test.describe('Admin - login e criação de produto', () => {
  test.beforeEach(async ({ context }) => {
    // Limpa storage para garantir fluxo de login
    await context.clearCookies()
    await context.storageState({ cookies: [], origins: [] })
  })

  test('faz login e cria um novo produto', async ({ page }) => {
    // Abre página de login diretamente
    await page.goto('/login')
    await expect(page.locator('text=Login Admin')).toBeVisible({ timeout: 10000 })

    // Preenche credenciais DEV
    await page.getByLabel('Email').fill('admin@example.com')
    await page.getByLabel('Password').fill('admin123')
    await page.getByRole('button', { name: 'Entrar' }).click()
    // Espera navegação para /products e presença do header/boas-vindas
    await page.waitForURL('**/products', { timeout: 15000 })

    // Deve navegar para Produtos (heading único)
    await expect(page.getByRole('heading', { name: 'Produtos' })).toBeVisible({ timeout: 10000 })

    // Abre diálogo de novo produto e garante que está visível
    await page.getByRole('button', { name: 'Novo Produto' }).click()
    await expect(page.getByRole('heading', { name: 'Novo Produto' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })

    // Preenche dados do produto
    const unique = Date.now()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome').fill(`Hambúrguer DEV ${unique}`)
    await dialog.getByLabel('Descrição').fill('Delicioso hambúrguer de teste')
    await dialog.getByLabel('Preço').fill('9.9')
    await dialog.getByLabel('Stock').fill('10')
    await dialog.getByLabel('URL da Imagem').fill('https://example.com/burger.jpg')

    // Guarda
    await dialog.getByRole('button', { name: 'Guardar' }).click()

    // Verifica que aparece na listagem, garantindo que célula da coluna 'Nome' contém o texto
    await expect(page.locator('.MuiDataGrid-root')).toBeVisible({ timeout: 20000 })
    const grid = page.locator('.MuiDataGrid-root')
    await expect(grid.locator('[role="row"] [data-field="name"]:has-text("' + `Hambúrguer DEV ${unique}` + '")')).toBeVisible({ timeout: 20000 })
  })
})