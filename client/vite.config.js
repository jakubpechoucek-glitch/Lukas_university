import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Výpočty sdílené se serverem (shared/calc)
    alias: { '@calc': fileURLToPath(new URL('../shared/calc/index.mjs', import.meta.url)) },
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
});
