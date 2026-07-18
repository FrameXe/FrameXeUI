// ╔══════════════════════════════════════════════════════════════╗
// ║  CENTRAL CONFIG                                              ║
// ╚══════════════════════════════════════════════════════════════╝

export const API_BASE    = ''       // Vite proxy → http://13.60.162.231:8000
export const BEARER_TOKEN = 'jwt-disabled-dev-token'

// Admin key — matches ADMIN_SECRET_KEY in backend .env
// Ops endpoints (camera assign, install tokens) require this header
export const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || 'changeme'

// HLS_BASE: set this if API doesn't return hls_url inline
// Example: 'http://13.60.162.231:8080'
export const HLS_BASE = null

// Detection polling interval (ms)
export const POLL_MS = 2000

// Original video resolution (bbox coordinates are in these dimensions)
export const ORIG_W = 1280
export const ORIG_H = 720