/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/explorer': 'http://127.0.0.1:8000',
      '/science': 'http://127.0.0.1:8000',
      '/discovery': 'http://127.0.0.1:8000',
      '/exploration': 'http://127.0.0.1:8000',
    },
  },
// @ts-expect-error vitest config
  test: { environment: 'jsdom', setupFiles: ['./src/testSetup.ts'], css: false },
});

