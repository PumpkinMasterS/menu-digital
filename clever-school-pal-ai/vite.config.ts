import { defineConfig } from "vite";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return ({
    server: {
      host: "::",
      port: 8080,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      },
      cors: {
        origin: mode === 'development' ? true : process.env.VITE_ALLOWED_ORIGINS?.split(',') || false,
      },
      // Proxy Supabase Edge Functions to avoid CORS during development
      proxy: {
        '/functions/v1': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path,
        },
      },
    },
    plugins: [
      react({
        // Enable Fast Refresh without emotion
        jsxImportSource: 'react',
      }),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      sourcemap: mode === 'development',
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // Core libraries
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            // UI components
            ui: [
              '@radix-ui/react-dialog', 
              '@radix-ui/react-dropdown-menu', 
              '@radix-ui/react-tabs',
              '@radix-ui/react-select',
              '@radix-ui/react-toast',
            ],
            // Backend integration
            supabase: ['@supabase/supabase-js'],
            query: ['@tanstack/react-query'],
            // Form handling
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
            // Utilities
            utils: ['date-fns', 'clsx', 'class-variance-authority'],
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
              : 'chunk';
            return `assets/${facadeModuleId}-[hash].js`;
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        '@supabase/supabase-js', 
        '@tanstack/react-query',
        'react-router-dom',
        'zod',
        'date-fns',
      ],
      exclude: ['@hello-pangea/dnd'],
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    preview: {
      port: 3000,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      },
    },
  });
});
