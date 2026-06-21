// ╔══════════════════════════════════════════════════════════════╗
// ║  CENTRAL CONFIG                                              ║
// ╚══════════════════════════════════════════════════════════════╝

export const API_BASE    = ''       // Vite proxy → http://13.60.162.231:8000
export const BEARER_TOKEN = ''

// HLS_BASE: set this if API doesn't return hls_url inline
// Example: 'http://13.60.162.231:8080'
export const HLS_BASE = null

// Detection polling interval (ms)
export const POLL_MS = 2000

// Original video resolution (bbox coordinates are in these dimensions)
export const ORIG_W = 1280
export const ORIG_H = 720