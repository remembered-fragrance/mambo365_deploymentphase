import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'THUMUA365 — Sổ vựa',
        short_name: 'THUMUA365',
        description: 'Sổ thu mua nông sản — chạy được khi không có mạng',
        theme_color: '#14663C',
        background_color: '#EDEAE3',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Git Bash trên Windows crash thì để lại `bash.exe.stackdump` ở thư mục đang đứng, file
    // còn bị khoá ⇒ watcher của Vite gặp EBUSY và tắt cả dev server.
    watch: { ignored: ['**/*.stackdump'] },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Phủ test của nghiệp vụ tính tiền đo ở repo BE (packages/core ≥ 80%).
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
  },
});
