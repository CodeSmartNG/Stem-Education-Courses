import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // ✅ IMPORTANT: Use your actual GitHub repo name
  const repoName = 'Stem-Education-Courses'; // <- CHANGE THIS to your repo name
  
  return {
    plugins: [react()],
    // ✅ Use absolute path for GitHub Pages
    base: `/${repoName}/`,
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      // ✅ Ensure correct asset paths
      assetsDir: 'assets',
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
    define: {
      'import.meta.env.VITE_PAYSTACK_PUBLIC_KEY': JSON.stringify(env.VITE_PAYSTACK_PUBLIC_KEY),
      'process.env': {},
    },
  };
});
