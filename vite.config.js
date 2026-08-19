import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // ✅ Get the repo name for GitHub Pages
  // If you're deploying to GitHub Pages, set this to your repo name
  // If deploying to root domain, use '/'
  const repoName = 'Stem-Education-Courses'; // <- Change to your repo name
  
  return {
    plugins: [react()],
    // ✅ FIX: Use absolute path for GitHub Pages
    base: mode === 'production' ? `/${repoName}/` : '/',
    // OR if deploying to root domain:
    // base: '/',
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      // ✅ Ensure assets are properly resolved
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name]-[hash].[ext]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    // ✅ Fix for process.env issues
    define: {
      'import.meta.env.VITE_PAYSTACK_PUBLIC_KEY': JSON.stringify(env.VITE_PAYSTACK_PUBLIC_KEY),
      // ✅ Add this to fix any process.env issues
      'process.env': {},
    },
  };
});
