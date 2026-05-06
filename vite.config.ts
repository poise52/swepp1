import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // '/' — деплой на VPS / домен в корне. Для GitHub Pages в подкаталоге задайте VITE_BASE=/swepp1/ перед build.
  base: process.env.VITE_BASE || '/',
  build: {
    outDir: 'dist',
  },
});

