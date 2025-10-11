import fs from 'fs'
import path from 'path'

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4000'

async function waitForServer(timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`)
      if (res.ok) return true
    } catch (_) {}
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Servidor não respondeu em ${timeoutMs}ms em ${BASE_URL}`)
}

async function httpJSON(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await res.json() : await res.text()
  return { ok: res.ok, status: res.status, data }
}

async function loginAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@site.test'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const res = await httpJSON('POST', '/api/auth/login', { email, password })
  if (!res.ok) throw new Error(`Falha login admin: ${res.status} ${JSON.stringify(res.data)}`)
  return res.data?.accessToken
}

async function createModel(adminToken) {
  const unique = Date.now()
  const payload = {
    name: `Modelo Teste ${unique}`,
    email: `modelo.${unique}@site.test`,
    phone: '+351900000001',
    category: 'fashion',
    bio: 'Perfil de teste gerado pelo script.'
  }
  const res = await httpJSON('POST', '/api/models', payload, adminToken)
  if (!res.ok) throw new Error(`Falha criar modelo: ${res.status} ${JSON.stringify(res.data)}`)
  const id = res.data?._id || res.data?.id || res.data?.modelId || res.data
  if (!id) throw new Error(`ID do modelo não encontrado na resposta: ${JSON.stringify(res.data)}`)
  return { id, payload }
}

function base64PngBlob() {
  // PNG 1x1 transparente
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
  const buf = Buffer.from(b64, 'base64')
  return new Blob([buf], { type: 'image/png' })
}

async function uploadPhotosJson(modelId, adminToken) {
  const dataUrl = 'data:image/png;base64,' + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
  return await httpJSON('POST', `/api/models/${modelId}/upload-photos`, { photos: [dataUrl] }, adminToken)
}

async function uploadPhotosMultipart(modelId, adminToken) {
  const form = new FormData()
  const blob1 = base64PngBlob()
  const blob2 = base64PngBlob()
  form.append('photos', blob1, 'teste1.png')
  form.append('photos', blob2, 'teste2.png')
  const res = await fetch(`${BASE_URL}/api/admin/models/${modelId}/photos`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: form,
  })
  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await res.json() : await res.text()
  return { ok: res.ok, status: res.status, data }
}

async function main() {
  const result = { start: new Date().toISOString(), baseUrl: BASE_URL }
  try {
    await waitForServer()
    result.health = true
    const token = await loginAdmin()
    result.adminToken = !!token
    const { id: modelId, payload } = await createModel(token)
    result.model = { id: modelId, payload }

    const jsonUpload = await uploadPhotosJson(modelId, token)
    result.jsonUpload = jsonUpload

    const multipartUpload = await uploadPhotosMultipart(modelId, token)
    result.multipartUpload = multipartUpload
  } catch (e) {
    result.error = e?.message || String(e)
  } finally {
    result.end = new Date().toISOString()
    const outPath = path.resolve(process.cwd(), 'upload_result.json')
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2))
    console.log(`Resultado salvo em: ${outPath}`)
    console.log(JSON.stringify(result, null, 2))
  }
}

main()