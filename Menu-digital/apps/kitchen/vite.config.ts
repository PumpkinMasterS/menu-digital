import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5281,
    proxy: {
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
      '/public': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})