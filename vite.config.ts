/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 網址是 https://fannyc96.github.io/events/，所以 base 要是 /events/
export default defineConfig({
  base: '/events/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
