import { test, expect } from '@playwright/test'

function generatePNGBuffer(): Buffer {
  // 1x1 transparent PNG
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=='
  return Buffer.from(base64, 'base64')
}

function buildFiles(count: number) {
  const files = [] as { name: string; mimeType: string; buffer: Buffer }[]
  for (let i = 1; i <= count; i++) {
    const idx = String(i).padStart(2, '0')
    files.push({ name: `test_${idx}.png`, mimeType: 'image/png', buffer: generatePNGBuffer() })
  }
  return files
}

test('Admin faz upload de 20 fotos para um modelo', async ({ page, request }) => {
  // 1) Login como admin
  await page.goto('/login')
  await page.fill('input[type="email"]', 'admin@site.test')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button[type="submit"], button.btn.btn-primary')
  // Aguardar confirmação de login mais robusta
  await expect.poll(async () => page.evaluate(() => !!localStorage.getItem('token')), { timeout: 45000 }).toBe(true)
  // Caso não tenha navegado automaticamente, ir explicitamente para /reservada e validar heading
  if (!(await page.evaluate(() => location.pathname.includes('/reservada')))) {
    await page.goto('/reservada', { waitUntil: 'domcontentloaded' })
  }
  await expect(page.locator('h1')).toHaveText(/Área Reservada/i)

  // Garantir que o token foi guardado (fallback de robustez)
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('token') ? 'ok' : 'no'), { timeout: 45000 }).toBe('ok')
  const token = await page.evaluate(() => localStorage.getItem('token'))
  expect(token).toBeTruthy()

  // 2) Criar modelo via API (admin-only)
  const unique = Date.now()
  const payload = {
    name: `Modelo Playwright ${unique}`,
    email: `modelo.playwright.${unique}@site.test`,
    phone: '+351900000777',
    category: 'fashion',
    bio: 'Perfil de teste gerado pelo Playwright.'
  }
  const createRes = await request.post('/api/models', {
    data: payload,
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(createRes.ok()).toBeTruthy()
  const createJson = await createRes.json()
  const modelId = createJson?._id || createJson?.id || createJson?.modelId || createJson
  expect(modelId, 'ID do modelo deve existir').toBeTruthy()

  // 3) Abrir dashboard do modelo e fazer upload de 20 fotos
  await page.goto(`/admin/models/${modelId}`)
  // O input é oculto; espera o label acionador ficar visível
  await page.waitForSelector('label[for="photoUpload"]', { timeout: 30000 })

  // Preparar 20 imagens
  const files = buildFiles(20)

  // Aguardar resposta do upload
  const uploadPromise = page.waitForResponse((response) => {
    const url = response.url()
    return url.includes(`/api/admin/models/${modelId}/photos`) && response.request().method() === 'POST' && response.status() === 200
  })

  await page.setInputFiles('#photoUpload', files)
  const uploadRes = await uploadPromise
  expect(uploadRes.ok()).toBeTruthy()

  // 4) Validar que o backend registou >= 20 fotos
  const getModel = await request.get(`/api/models/${modelId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(getModel.ok()).toBeTruthy()
  const modelData = await getModel.json()
  const photoCount = Array.isArray(modelData?.photos) ? modelData.photos.length : 0
  expect(photoCount).toBeGreaterThanOrEqual(20)

  // 5) Screenshot para evidência
  await page.screenshot({ path: `playwright-report/admin_model_${modelId}_upload.png`, fullPage: true })
})