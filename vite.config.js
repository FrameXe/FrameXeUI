import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = 'http://13.60.162.231:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // ── SSE streams — must disable buffering for real-time events ──
      '/api/sse': {
        target: BACKEND,
        changeOrigin: true,
        secure: false,
        // Disable proxy buffering so SSE events stream through immediately
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Cache-Control', 'no-cache')
            proxyReq.setHeader('X-Accel-Buffering', 'no')
          })
        },
      },

      // ── Ingest SSE (legacy alert stream) ──────────────────────────
      '/ingest': {
        target: BACKEND,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Cache-Control', 'no-cache')
            proxyReq.setHeader('X-Accel-Buffering', 'no')
          })
        },
      },

      // ── All other /api/* routes (REST) ────────────────────────────
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        secure: false,
      },

      // ── HLS streams (Edge device) ──────────────────────────────────
      '/hls': {
        target: 'https://wnlpfl7c-8080.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
        headers: { 'X-Tunnel-Skip-AntiPhishing-Page': 'true' },
      },
    },
  },
})
