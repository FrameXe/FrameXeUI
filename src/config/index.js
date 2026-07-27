// ╔══════════════════════════════════════════════════════════════╗
// ║  CENTRAL CONFIG                                              ║
// ╚══════════════════════════════════════════════════════════════╝

// Electron detection — preload.cjs exposes window.electronAPI
const _isElectron   = typeof window !== 'undefined' && !!window.electronAPI?.isElectron
const _isDevServer  = typeof window !== 'undefined' && /localhost:5173/.test(window.location?.href || '')

// In Electron production → Vite proxy is NOT available, so we need the real backend URL.
// In dev (web or Electron) → Vite proxy handles /api → localhost:9002, so API_BASE stays ''
export const API_BASE    = (_isElectron && !_isDevServer)
  ? (localStorage.getItem('vframe_api_base') || 'http://localhost:9002')
  : ''
export const BEARER_TOKEN = 'jwt-disabled-dev-token'

// Admin key — matches ADMIN_SECRET_KEY in backend .env
// Ops endpoints (camera assign, install tokens) require this header
export const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || 'changeme'

// HLS_BASE: set this if API doesn't return hls_url inline
// Example: 'http://localhost:8080'
export const HLS_BASE = null

// Detection polling interval (ms)
export const POLL_MS = 2000

// Original video resolution (bbox coordinates are in these dimensions)
export const ORIG_W = 1280
export const ORIG_H = 720