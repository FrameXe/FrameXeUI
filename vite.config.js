import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Master Backend — all /api/* routes
      '/api': {
        target: 'https://n22tx49p-5099.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
        headers: { 'X-Tunnel-Skip-AntiPhishing-Page': 'true' },
      },
      // Master Backend — ingest routes (internal, no auth)
      '/ingest': {
        target: 'https://n22tx49p-5099.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
        headers: { 'X-Tunnel-Skip-AntiPhishing-Page': 'true' },
      },
      // HLS streams (Edge device — different host/port)
      '/hls': {
        target: 'https://wnlpfl7c-8080.inc1.devtunnels.ms',
        changeOrigin: true,
        secure: false,
        headers: { 'X-Tunnel-Skip-AntiPhishing-Page': 'true' },
      },
    }
  },
})
