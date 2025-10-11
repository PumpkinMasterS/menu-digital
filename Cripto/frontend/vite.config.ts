import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/risk': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/metrics': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [react()]
})