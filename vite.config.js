import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Master backend URL — docker-compose maps container :8000 → host :9002
const BACKEND = 'http://localhost:9002'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // ── SSE streams — must disable buffering for real-time events ──
      // /api/sse/alerts  → publisher: ingest.py → _publish_alerts_to_sse()
      // /api/sse/cameras → publisher: ingest.py → _publish_sse_task()
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

      // ── Ingest endpoints (GPU worker → master_backend) ────────────
      // Alert Microservice ab use nahi hota — master_backend khud handle karta hai.
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

      // ── All other /api/* routes (REST + snapshots) ────────────────
      // Includes:
      //   GET /api/alerts/live          → MongoDB alerts
      //   PATCH /api/alerts/:id/acknowledge
      //   GET /api/snapshots/:filename  → locally saved alert snapshots
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        secure: false,
      },

      // ── HLS streams (Edge device) ──────────────────────────────────
      '/hls': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
