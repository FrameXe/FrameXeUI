// ══════════════════════════════════════════════════════════════
//  LIVE DETECTION FEED — canvas ke liye
//
//  Yeh file canvas pe real-time boxes draw karne ke liye
//  detection data manage karti hai.
//
//  USE_MOCK=true:
//    → setInterval se fake detections generate hoti hain (genLiveDet)
//    → har 900ms mein naya detection object
//
//  USE_MOCK=false (2 options):
//
//  OPTION A — API Polling (simple, abhi ke liye):
//    → har POLL_MS mein GET /api/detections/live?camera_id=cam-01
//    → response mein x,y,w,h,label,confidence hona chahiye
//
//  OPTION B — WebSocket (real-time, future):
//    → ek connection, server khud push karta hai
//    → ws://backend/ws/camera/cam-01
//    → message: { detections: [{x,y,w,h,label,confidence}] }
//
// ══════════════════════════════════════════════════════════════

import { USE_MOCK, API_BASE, WS_BASE, POLL_MS } from '../config/index.js'
import { genLiveDet } from './mockData.js'
import { UC_CANVAS } from '../constants/useCases.js'

// ── MOCK feed ──────────────────────────────────────────────────
function startMockFeed(camera, onDetection) {
  const iv = setInterval(() => {
    onDetection(genLiveDet(camera.id, camera.useCase))
  }, 900)
  return () => clearInterval(iv)
}

// ── API Polling feed ───────────────────────────────────────────
function startApiFeed(camera, onDetection) {
  let stopped = false
  const color = UC_CANVAS[camera.useCase]?.color || '#00cfff'
  const label = UC_CANVAS[camera.useCase]?.label || 'Object'

  const poll = async () => {
    if (stopped) return
    try {
      const res  = await fetch(`${API_BASE}/api/detections/live?camera_id=${camera.id}`, {
        signal: AbortSignal.timeout(2000),
      })
      const data = await res.json()
      const dets = data.detections || data || []

      dets.forEach(d => onDetection({
        id:         d.id || `api-${Date.now()}-${Math.random()}`,
        cameraId:   camera.id,
        color,
        label:      d.label || d.class_name || label,
        // Coordinates in original video resolution
        x:          d.x ?? d.bbox?.x ?? 0,
        y:          d.y ?? d.bbox?.y ?? 0,
        w:          d.w ?? d.width  ?? d.bbox?.width  ?? 60,
        h:          d.h ?? d.height ?? d.bbox?.height ?? 100,
        confidence: d.confidence ?? d.conf ?? 0,
        plate:      d.plate    || d.license_plate || null,
        speedVal:   d.speed    || d.speed_kmh     || null,
        age:   0,
        alpha: 1,
      }))
    } catch (_) {
      // silently skip failed polls
    }
    if (!stopped) setTimeout(poll, POLL_MS)
  }

  poll()
  return () => { stopped = true }
}

// ── WebSocket feed ─────────────────────────────────────────────
function startWsFeed(camera, onDetection) {
  const color = UC_CANVAS[camera.useCase]?.color || '#00cfff'
  const label = UC_CANVAS[camera.useCase]?.label || 'Object'

  const ws = new WebSocket(`${WS_BASE}/ws/camera/${camera.id}`)

  ws.onopen = () => {
    ws.send(JSON.stringify({ action: 'subscribe', camera_id: camera.id }))
  }

  ws.onmessage = (e) => {
    const msg  = JSON.parse(e.data)
    const dets = msg.detections || (msg.event === 'detection' ? [msg.data || msg] : [])
    dets.forEach(d => onDetection({
      id:         d.id || `ws-${Date.now()}-${Math.random()}`,
      cameraId:   camera.id,
      color,
      label:      d.label || label,
      x: d.x, y: d.y, w: d.w, h: d.h,
      confidence: d.confidence ?? 0,
      plate:      d.plate    || null,
      speedVal:   d.speed    || null,
      age: 0, alpha: 1,
    }))
  }

  ws.onerror = () => {}
  ws.onclose = () => {}

  return () => ws.close()
}

// ── PUBLIC: start feed — returns stop function ─────────────────
export function startLiveFeed(camera, onDetection) {
  if (camera.status !== 'active') return () => {}
  if (USE_MOCK)                   return startMockFeed(camera, onDetection)
  // Uncomment next line for WebSocket instead of polling:
  // return startWsFeed(camera, onDetection)
  return startApiFeed(camera, onDetection)
}
