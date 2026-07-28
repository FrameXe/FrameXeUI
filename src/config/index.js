// ╔══════════════════════════════════════════════════════════════╗
// ║  CENTRAL CONFIG                                              ║
// ╚══════════════════════════════════════════════════════════════╝

// Detection for Electron runtime & dev server environment
const _isFileProtocol = typeof window !== 'undefined' && window.location?.protocol === 'file:'
const _isDevServer    = typeof window !== 'undefined' && /localhost:5173/.test(window.location?.href || '')
const _isElectron     = typeof window !== 'undefined' && (!!window.electronAPI?.isElectron || _isFileProtocol)

// In packaged Electron (file:// protocol) or any standalone environment:
// Relative paths like /api/... will fail with "file:///api/..." or cross-origin errors.
// Always target real Master Backend http://localhost:9002 unless explicitly proxied by Vite dev server.
export const API_BASE = (_isElectron || !_isDevServer)
  ? (localStorage.getItem('vframe_api_base') || 'http://localhost:9002')
  : ''

export const BEARER_TOKEN = 'jwt-disabled-dev-token'

// Admin key — matches ADMIN_SECRET_KEY in backend .env
export const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || 'changeme'

// HLS_BASE: set this if API doesn't return hls_url inline
export const HLS_BASE = null

// Detection polling interval (ms)
export const POLL_MS = 2000

// Original video resolution (bbox coordinates are in these dimensions)
export const ORIG_W = 1280
export const ORIG_H = 720