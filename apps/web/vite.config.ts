import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        headers: {
          'X-Forwarded-Host': 'localhost:3000',
          'X-Forwarded-Proto': 'http',
        },
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
