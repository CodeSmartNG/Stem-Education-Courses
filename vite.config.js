import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // ✅ FIXED: Use '/' for Vercel deployment
  // './' causes issues with asset paths on Vercel
  base: '/',
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    // ✅ Add chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // ✅ Ensure assets are in the right place
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  
  preview: {
    port: 3000,
    open: true,
  },
  
  // ✅ Add resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@utils': '/src/utils',
      '@styles': '/src/styles',
      '@assets': '/src/assets',
    },
  },
  
  // ✅ Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})