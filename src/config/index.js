// ╔══════════════════════════════════════════════════════════════╗
// ║           CENTRAL CONFIG — SIRF YEH FILE CHANGE KARO        ║
// ║                                                              ║
// ║  Mock → API karna ho:                                        ║
// ║    1. USE_MOCK = false karo                                  ║
// ║    2. API_BASE apna backend URL daalo                        ║
// ║    3. WS_BASE apna websocket URL daalo (agar WS use karo)    ║
// ║                                                              ║
// ║  HLS stream add karna ho:                                    ║
// ║    mockData.js mein camera ka hlsUrl set karo                ║
// ║    Example: hlsUrl: 'http://192.168.1.10:8888/live/cam-01/index.m3u8'
// ╚══════════════════════════════════════════════════════════════╝

export const USE_MOCK = true          // false karo → real API use hogi

export const API_BASE = 'http://localhost:8000'   // tumhara backend
export const WS_BASE  = 'ws://localhost:8000'     // tumhara websocket

// Original video resolution jisme backend coordinates bhejta hai
// (bounding box x,y,w,h is resolution ke hisab se aate hain)
export const ORIG_W = 1280
export const ORIG_H = 720

// API polling interval (milliseconds) — sirf USE_MOCK=false mein use hoga
export const POLL_MS = 500
