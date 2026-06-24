import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// В деве фронт ходит на /api, Vite проксирует это на API (по умолчанию :4000).
// В проде задаётся VITE_API_URL (абсолютный URL задеплоенного API).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  // Прод-предпросмотр (вариант с двумя сервисами на Railway)
  preview: {
    host: true,
    port: Number(process.env.PORT) || 4173,
    allowedHosts: true,
  },
});
