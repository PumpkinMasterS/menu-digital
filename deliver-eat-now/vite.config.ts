import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // Permite acesso de qualquer IP
    port: 8081, // Porta atual do servidor
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Otimizações para produção
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.logs em produção
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    rollupOptions: {
      output: {
        // Code splitting para melhor performance
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers'],
        },
      },
    },
    // Aumentar limite de warning para chunks grandes
    chunkSizeWarningLimit: 1000,
  },
  // Otimizações para desenvolvimento
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
    ],
  },
  // Performance em desenvolvimento
  esbuild: {
    // Remove console.logs também em desenvolvimento se necessário
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
