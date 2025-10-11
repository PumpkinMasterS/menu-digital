import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tailwind from '@tailwindcss/postcss'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Forçar Vite a não procurar ficheiros externos de configuração do PostCSS,
  // evitando o erro de parse quando processa CSS.
  css: {
    // Fornecemos explicitamente as opções do PostCSS com o plugin do Tailwind v4,
    // assim o Vite não tenta carregar configuração externa (package.json/.postcssrc).
    postcss: {
      plugins: [tailwind()],
    },
  },
})
