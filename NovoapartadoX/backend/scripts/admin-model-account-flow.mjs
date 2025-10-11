#!/usr/bin/env node
// Script CLI para verificar o fluxo de criação/validação de contas de modelos
// - Cria conta (User role 'model' com password gerada)
// - Faz login como modelo e troca a password
// - Cria perfil de modelo (Model) e alterna ativo/oculto/verificado
// - Cria listing público e alterna ativo/oculto/verificado/destaque
// - Opcionalmente deleta o modelo (cleanup)

import fs from 'fs'
import path from 'path'

const base = process.env.BACKEND_URL || 'http://localhost:4000'
const adminEmail = process.env.ADMIN_EMAIL || 'admin@site.test'
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
const cleanup = process.env.FLOW_CLEANUP === 'true' // se true, deleta o modelo ao final

function logStep(title, ok, extra = {}) {
  const status = ok ? '✅' : '❌'
  console.log(`${status} ${title}`)
  if (!ok && extra?.error) console.error('   Erro:', extra.error)
}

async function http(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${base}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch {}
  return { status: res.status, ok: res.ok, data, text, headers: Object.fromEntries(res.headers.entries()) }
}

function ensureId(obj) {
  if (!obj) return null
  return obj._id || obj.id || obj.modelId || null
}

async function main() {
  const result = {
    start: new Date().toISOString(),
    base,
    adminLogin: {},
    createdUser: {},
    modelLogin: {},
    passwordChange: {},
    createdModel: {},
    modelToggles: {},
    createdListing: {},
    listingToggles: {},
    cleanup: {},
    end: null
  }

  // 1) Login Admin
  const loginAdmin = await http('POST', '/api/auth/login', { email: adminEmail, password: adminPassword })
  result.adminLogin = { status: loginAdmin.status, ok: loginAdmin.ok }
  logStep('Login admin', loginAdmin.ok, { error: loginAdmin.data?.error })
  if (!loginAdmin.ok) throw new Error(`Falha no login admin: ${loginAdmin.text}`)
  const adminToken = loginAdmin.data?.accessToken

  // 2) Criar conta de modelo (User)
  const ts = Date.now()
  const modelName = `Modelo Teste ${new Date(ts).toISOString().slice(0,19).replace('T',' ')}`
  const modelEmail = `modelo.${ts}@site.test`
  const createUser = await http('POST', '/api/admin/users', { name: modelName, email: modelEmail }, adminToken)
  const generatedPassword = createUser.data?.generatedPassword
  result.createdUser = { status: createUser.status, ok: createUser.ok, id: ensureId(createUser.data), generatedPassword }
  logStep('Criar conta de modelo (User)', createUser.ok, { error: createUser.data?.error })
  if (!createUser.ok) throw new Error(`Falha ao criar user: ${createUser.text}`)
  if (createUser.ok && generatedPassword) {
    console.log(`   Password gerada (guarde-a com segurança): ${generatedPassword}`)
  }

  // 3) Login como modelo com a password gerada
  const loginModel = await http('POST', '/api/auth/login', { email: modelEmail, password: generatedPassword })
  result.modelLogin = { status: loginModel.status, ok: loginModel.ok }
  logStep('Login modelo com password gerada', loginModel.ok, { error: loginModel.data?.error })
  if (!loginModel.ok) throw new Error(`Falha no login modelo: ${loginModel.text}`)
  const modelToken = loginModel.data?.accessToken
  const modelUserId = loginModel.data?.user?.id || loginModel.data?.user?._id || loginModel.data?.user?.id

  // 4) Trocar password do modelo
  // Observação: o backend valida senha apenas alfanumérica (min 6 chars).
  // Para garantir sucesso no re-login, usamos uma senha compatível.
  const newPassword = 'Teste1234'
  const changePass = await http('PATCH', `/api/users/${modelUserId}`, { password: newPassword }, modelToken)
  result.passwordChange = { status: changePass.status, ok: changePass.ok }
  logStep('Trocar password do modelo', changePass.ok, { error: changePass.data?.error })
  if (!changePass.ok) throw new Error(`Falha ao trocar password: ${changePass.text}`)

  // 4.1) Re-login com nova password (validação)
  const relogModel = await http('POST', '/api/auth/login', { email: modelEmail, password: newPassword })
  logStep('Re-login modelo com nova password', relogModel.ok, { error: relogModel.data?.error })

  // 5) Criar perfil de modelo (Model)
  const createModel = await http('POST', '/api/models', {
    name: modelName,
    email: modelEmail,
    phone: '+351900000000',
    category: 'fashion',
    bio: 'Perfil de demonstração para fluxo de contas.'
  }, adminToken)
  result.createdModel = { status: createModel.status, ok: createModel.ok, id: ensureId(createModel.data) }
  logStep('Criar perfil Model', createModel.ok, { error: createModel.data?.error })
  const modelId = ensureId(createModel.data)

  // 6) Alternar ativo/oculto/verificado no Model
  const setInactive = await http('PUT', `/api/models/${modelId}`, { active: false }, adminToken)
  const setActive = await http('PUT', `/api/models/${modelId}`, { active: true }, adminToken)
  const setVerified = await http('PUT', `/api/models/${modelId}`, { verified: true }, adminToken)
  const unsetVerified = await http('PUT', `/api/models/${modelId}`, { verified: false }, adminToken)
  result.modelToggles = {
    inactive: setInactive.ok,
    active: setActive.ok,
    verified: setVerified.ok,
    unverified: unsetVerified.ok
  }
  logStep('Model: desativar', setInactive.ok, { error: setInactive.data?.error })
  logStep('Model: ativar', setActive.ok, { error: setActive.data?.error })
  logStep('Model: verificar', setVerified.ok, { error: setVerified.data?.error })
  logStep('Model: remover verificação', unsetVerified.ok, { error: unsetVerified.data?.error })

  // 7) Criar listing público (perfil visível)
  const createListing = await http('POST', '/api/listings', {
    name: modelName,
    phone: '+351900000000',
    city: 'Lisboa',
    age: 25,
    category: 'acompanhante',
    description: 'Anúncio de teste automatizado',
    services: [],
    languages: []
  }, adminToken)
  result.createdListing = { status: createListing.status, ok: createListing.ok, id: ensureId(createListing.data) }
  logStep('Criar Listing', createListing.ok, { error: createListing.data?.error })
  const listingId = ensureId(createListing.data)

  // 8) Alternar ativo/oculto/verificado/destaque no Listing
  const activateListing = await http('PATCH', `/api/admin/listings/${listingId}/activate`, {}, adminToken)
  const deactivateListing = await http('PATCH', `/api/admin/listings/${listingId}/deactivate`, {}, adminToken)
  const verifyListing = await http('PATCH', `/api/admin/listings/${listingId}/verify`, {}, adminToken)
  const unverifyListing = await http('PATCH', `/api/admin/listings/${listingId}/unverify`, {}, adminToken)
  const featureListing = await http('PATCH', `/api/admin/listings/${listingId}/feature`, {}, adminToken)
  const unfeatureListing = await http('PATCH', `/api/admin/listings/${listingId}/unfeature`, {}, adminToken)
  result.listingToggles = {
    activate: activateListing.ok,
    deactivate: deactivateListing.ok,
    verify: verifyListing.ok,
    unverify: unverifyListing.ok,
    feature: featureListing.ok,
    unfeature: unfeatureListing.ok
  }
  logStep('Listing: ativar', activateListing.ok, { error: activateListing.data?.error })
  logStep('Listing: ocultar', deactivateListing.ok, { error: deactivateListing.data?.error })
  logStep('Listing: verificar', verifyListing.ok, { error: verifyListing.data?.error })
  logStep('Listing: remover verificação', unverifyListing.ok, { error: unverifyListing.data?.error })
  logStep('Listing: destacar', featureListing.ok, { error: featureListing.data?.error })
  logStep('Listing: remover destaque', unfeatureListing.ok, { error: unfeatureListing.data?.error })

  // 9) Cleanup opcional: deletar modelo
  if (cleanup && modelId) {
    const delModel = await http('DELETE', `/api/models/${modelId}`, null, adminToken)
    result.cleanup = { deletedModel: delModel.ok, status: delModel.status }
    logStep('Cleanup: deletar Model', delModel.ok, { error: delModel.data?.error })
  }

  result.end = new Date().toISOString()
  const outPath = path.resolve(process.cwd(), 'admin_model_account_flow_result.json')
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2))
  console.log(`\nResumo salvo em: ${outPath}`)
}

main().catch(err => {
  console.error('Erro no fluxo:', err?.message || err)
  process.exitCode = 1
})