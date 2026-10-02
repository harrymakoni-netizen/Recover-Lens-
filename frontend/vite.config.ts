import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    // docs/exercise_library.json lives outside the frontend root
    fs: { allow: ['..'] },
    proxy: {
      '/api': { target: process.env.API_URL ?? 'http://localhost:8000', changeOrigin: true },
    },
  },
  preview: {
    host: true,
    proxy: {
      '/api': { target: process.env.API_URL ?? 'http://localhost:8000', changeOrigin: true },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
