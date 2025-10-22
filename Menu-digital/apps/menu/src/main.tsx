import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme as defaultTheme, createAppTheme, DEFAULT_APPEARANCE } from './theme'
import { getPublicTheme } from './api'

function ThemeRoot() {
  const [currentTheme, setCurrentTheme] = useState(defaultTheme)

  useEffect(() => {
    let mounted = true
    async function load() {
      // Prefer backend-provided theme; fallback to localStorage; default if none
      try {
        const backend = await getPublicTheme()
        const localRaw = localStorage.getItem('appearanceSettings')
        const local = localRaw ? JSON.parse(localRaw) : null
        const appearance = backend || local || DEFAULT_APPEARANCE
        if (mounted) setCurrentTheme(createAppTheme(appearance))
      } catch {
        if (mounted) setCurrentTheme(createAppTheme(DEFAULT_APPEARANCE))
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
        <App />
      </BrowserRouter>
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeRoot />
  </React.StrictMode>
)