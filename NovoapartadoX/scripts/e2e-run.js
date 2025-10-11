const { spawn } = require('child_process')

function start(cmd, args, options) {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...options })
  p.on('exit', (code) => console.log(`[${cmd}] exited with code ${code}`))
  return p
}

const FRONTEND_PORT = process.env.FRONTEND_PORT || 5180
const API_PORT = process.env.API_PORT || 4001
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`
const API_BASE_URL = `http://localhost:${API_PORT}`

console.log(`Preparando ambiente E2E: backend ${API_BASE_URL}, frontend ${FRONTEND_URL}`)

// Backend
const backend = start('powershell', [
  `$env:PORT='${API_PORT}'; $env:FRONTEND_URL='${FRONTEND_URL}'; cd backend; npm run dev`
])

// Frontend
const frontend = start('powershell', [
  `$env:VITE_API_BASE_URL='${API_BASE_URL}'; cd frontend; npm run dev -- --strictPort --port ${FRONTEND_PORT}`
])

// Aguardar Vite pronto e depois rodar Playwright
function runPlaywright() {
  console.log('Iniciando teste Playwright...')
  const test = start('powershell', [
    `$env:PW_BASE_URL='${FRONTEND_URL}'; npx playwright test tests/playwright/admin_upload_20_photos.spec.ts --headed`
  ])

  test.on('exit', (code) => {
    console.log(`Teste Playwright terminou com código ${code}`)
    console.log('Abrindo relatório...')
    start('powershell', ['npx playwright show-report'])
  })
}

// Pequeno atraso para servidores subirem
setTimeout(runPlaywright, 5000)

process.on('SIGINT', () => {
  console.log('Encerrando processos...')
  backend.kill('SIGINT')
  frontend.kill('SIGINT')
  process.exit(0)
})