import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// Plain Svelte + Vite (no SvelteKit). In dev the API runs on :8080.
export default defineConfig(({ mode }) => ({
  plugins: [svelte()],
  server: { proxy: { '/api': 'http://localhost:8080' } },
  resolve: mode === 'test' ? { conditions: ['browser'] } : undefined,
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
}));
