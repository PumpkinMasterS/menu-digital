import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'

// Persistência automática de token via URL (?token=...)
(function persistTokenFromURL() {
  try {
    const url = new URL(window.location.href)
    const token = url.searchParams.get('token')
    if (token) {
      // Heurística: JWT geralmente tem 3 partes separadas por '.'
      const looksLikeJWT = token.split('.').length === 3
      if (looksLikeJWT) {
        window.localStorage.setItem('authToken', token)
        // Também limpar ADMIN_TOKEN para evitar headers errados
        window.localStorage.removeItem('ADMIN_TOKEN')
      } else {
        window.localStorage.setItem('ADMIN_TOKEN', token)
      }
      // Remove o token da URL para evitar partilhas acidentais
      url.searchParams.delete('token')
      window.history.replaceState(null, document.title, url.toString())
    }
  } catch (e) {
    // Silencioso: se algo falhar, não bloqueia app
    console.warn('Persistência de token via URL falhou:', e)
  }
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
)