import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Bản production trên Vercel bắt buộc có máy chủ. Thiếu biến thì app vẫn build được nhưng chạy
 * chế độ offline "tài khoản của máy này": mở link không ra màn đăng nhập mà Vercel vẫn báo deploy
 * thành công (13/10/2026). Chỉ chặn khi Vercel build production (`VERCEL_ENV`); CI, preview và máy
 * dev vẫn build offline được.
 */
const assertProductionEnv = (mode: string): void => {
  if (process.env.VERCEL_ENV !== 'production') return;
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const has = (key: string): boolean => Boolean(env[key]?.trim());
  const missing = [
    ...(has('VITE_API_URL') ? [] : ['VITE_API_URL']),
    ...(has('VITE_SUPABASE_URL') ? [] : ['VITE_SUPABASE_URL']),
    ...(has('VITE_SUPABASE_PUBLISHABLE_KEY') || has('VITE_SUPABASE_ANON_KEY') ? [] : ['VITE_SUPABASE_PUBLISHABLE_KEY']),
  ];
  if (missing.length > 0) {
    throw new Error(
      `Thiếu biến môi trường cho bản production: ${missing.join(', ')}. Đặt trong Vercel → Settings → Environment Variables (Production) rồi deploy lại.`,
    );
  }
  if (!(env.VITE_API_URL ?? '').trim().startsWith('https://')) {
    throw new Error('VITE_API_URL của bản production phải bắt đầu bằng https:// — trang https gọi API http bị trình duyệt chặn.');
  }
};

/**
 * `<link rel="preconnect">` tới API và Supabase: trình duyệt mở sẵn DNS + TCP + TLS ngay lúc đọc
 * HTML, song song với tải JS — lời gọi đầu tiên (làm mới phiên, `/v1/me`) khỏi tốn thêm 2–3 lượt
 * đi về trên mạng di động. `crossorigin` vì fetch CORS không kèm cookie dùng kết nối riêng.
 */
const preconnect = (mode: string): Plugin => ({
  name: 'thumua365:preconnect',
  transformIndexHtml() {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const origins = [env.VITE_API_URL, env.VITE_SUPABASE_URL].flatMap((value) => {
      try {
        return value?.trim() ? [new URL(value.trim()).origin] : [];
      } catch {
        return [];
      }
    });
    return [...new Set(origins)].map((href) => ({
      tag: 'link',
      attrs: { rel: 'preconnect', href, crossorigin: '' },
      injectTo: 'head-prepend' as const,
    }));
  },
});

export default defineConfig(({ mode }) => {
  assertProductionEnv(mode);
  return {
    plugins: [
      preconnect(mode),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'logo.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png'],
        manifest: {
          name: 'THUMUA365 — Sổ vựa',
          short_name: 'THUMUA365',
          description: 'Sổ thu mua nông sản — chạy được khi không có mạng',
          // Plugin mặc định 'en'; TWA / app đã cài đọc ngôn ngữ ở đây.
          lang: 'vi',
          theme_color: '#14663C',
          background_color: '#EDEAE3',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            // Nền trắng, logo trong vùng an toàn 70% — Android cắt icon thành tròn / bo góc.
            { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
  };
});
