// ╔══════════════════════════════════════════════════════════════╗
// ║  CENTRAL CONFIG — SIRF YEH FILE CHANGE KARO                 ║
// ╠══════════════════════════════════════════════════════════════╣
// ║  Mock → Real API:                                            ║
// ║    USE_MOCK = false                                          ║
// ║    API_BASE = ''                                             ║
// ╚══════════════════════════════════════════════════════════════╝

export const USE_MOCK = false                      // false → real API
export const API_BASE = ''                         // Relative URL (Vite Proxy carries it to devtunnels)
export const BEARER_TOKEN = '' 

// HLS — agar /api/cameras/{id}/stream se URL nahi aata
// toh yahan se auto-build: HLS_BASE/{camera_id}/index.m3u8
export const HLS_BASE = null
// Example: 'http://192.168.1.10:8888'

// Detection polling interval (ms)
export const POLL_MS = 1000

// Original video resolution (bbox coordinates is mein hain)
export const ORIG_W = 1280
export const ORIG_H = 720