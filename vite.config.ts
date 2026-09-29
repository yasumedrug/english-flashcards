import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  base: loadEnv(mode, '.', 'VITE_').VITE_BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'English Cards',
        short_name: '英語カード',
        lang: 'ja',
        description: '自分専用の英語フラッシュカード',
        theme_color: '#f7faff',
        background_color: '#f7faff',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,tsv}'],
        runtimeCaching: [{
          urlPattern: /\/data\/cards\.tsv$/,
          handler: 'NetworkFirst',
          options: { cacheName: 'cards-data', networkTimeoutSeconds: 5, expiration: { maxEntries: 2 } }
        }]
      }
    })
  ]
}))
