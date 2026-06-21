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
        target: 'http://13.60.162.231:8000',
        changeOrigin: true,
        secure: false,
      },
      // Master Backend — ingest routes
      '/ingest': {
        target: 'http://13.60.162.231:8000',
        changeOrigin: true,
        secure: false,
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
