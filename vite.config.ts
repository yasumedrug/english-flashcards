import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = '/english-flashcards/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      scope: base,
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'favicon-32.png'],
      manifest: {
        name: 'English Cards',
        short_name: '英語カード',
        lang: 'ja',
        id: base,
        description: '自分専用の英語フラッシュカード',
        theme_color: '#fafaf8',
        background_color: '#fafaf8',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // Learning content is refreshed independently of the app release.
        // IndexedDB holds the offline copy; do not pin TSV in the precache.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.endsWith('/data/cards.tsv'),
          handler: 'NetworkOnly',
          options: { fetchOptions: { cache: 'no-store' } }
        }]
      }
    })
  ]
})
