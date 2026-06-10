import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local `npm run dev`, proxy /api to the NestJS server on :3000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
