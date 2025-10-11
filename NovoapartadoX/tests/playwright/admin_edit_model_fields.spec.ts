import { test, expect } from '@playwright/test'

function uniqueSuffix() {
  return Date.now()
}

test('Editar e persistir campos do modelo (bio e novos campos)', async ({ page, request }) => {
  // 1) Login como admin
  await page.goto('/login')
  await page.fill('input[type="email"]', 'admin@site.test')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button[type="submit"], button.btn.btn-primary')
  await page.waitForURL(/\/reservada$/i, { timeout: 45000 })

  await expect.poll(async () => page.evaluate(() => localStorage.getItem('token') ? 'ok' : 'no'), { timeout: 45000 }).toBe('ok')
  const token = await page.evaluate(() => localStorage.getItem('token'))
  expect(token).toBeTruthy()

  // 2) Criar modelo via API
  const u = uniqueSuffix()
  const createRes = await request.post('/api/models', {
    data: {
      name: `Modelo Edit ${u}`,
      email: `modelo.edit.${u}@site.test`,
      phone: '+351900000888',
      category: 'fashion',
      bio: 'Bio inicial gerada pelo Playwright.'
    },
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(createRes.ok()).toBeTruthy()
  const createJson = await createRes.json()
  const modelId = createJson?._id || createJson?.id || createJson?.modelId || createJson
  expect(modelId, 'ID do modelo deve existir').toBeTruthy()

  // 3) Abrir dashboard do modelo
  await page.goto(`/admin/models/${modelId}`)
  await page.waitForSelector('form', { timeout: 30000 })

  // 4) Editar campos: bio (about), nationality, eyeColor, age, height, weight, city
  await page.fill('textarea[name="about"]', 'Bio atualizada via Playwright.')
  await page.fill('input[name="nationality"]', 'Portuguese')
  await page.fill('input[name="eyeColor"]', 'Green')
  await page.fill('input[name="age"]', '27')
  await page.fill('input[name="height"]', '175')
  await page.fill('input[name="weight"]', '68')
  await page.fill('input[name="city"]', 'Lisboa')

  // 5) Submeter
  await page.click('button[type="submit"], button.btn.btn-primary')

  // 6) Validar via API que persistiu
  const getModel = await request.get(`/api/models/${modelId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(getModel.ok()).toBeTruthy()
  const data = await getModel.json()
  expect(data?.bio).toBe('Bio atualizada via Playwright.')
  expect(data?.nationality).toBe('Portuguese')
  expect(data?.eyeColor).toBe('Green')
  expect(Number(data?.age)).toBe(27)
  expect(Number(data?.height)).toBe(175)
  expect(Number(data?.weight)).toBe(68)
  expect(data?.city).toBe('Lisboa')
})