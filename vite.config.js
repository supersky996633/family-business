import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // 使用 generateSW 策略，由 workbox 自动生成 sw 并预缓存静态资源
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      manifest: {
        name: '家庭业务管理',
        short_name: '家庭业务管理',
        description: '家庭资产汇总、记账、趋势分析PWA应用',
        theme_color: '#1976d2',
        background_color: '#f5f7fa',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'zh-CN',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // 导航请求离线回退到 index.html，保证 SPA 路由离线可用
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/sw.js/, /^\/workbox-.*\.js$/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'family-pages',
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: ({ request }) =>
              ['style', 'script', 'worker', 'image', 'font'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'family-assets' },
          },
        ],
      },
    }),
  ],
  server: { host: true, port: 5173 },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
})
