// ══════════════════════════════════════════════════════════════
//  API SERVICE
//  USE_MOCK=true  → mockData se return
//  USE_MOCK=false → real fetch call
//
//  Baad mein API connect karna ho:
//  1. config/index.js mein USE_MOCK = false karo
//  2. API_BASE apna backend URL daao
//  3. Backend se same shape ka data bhejo (mockData.js dekho)
// ══════════════════════════════════════════════════════════════

import { USE_MOCK, API_BASE } from '../config/index.js'
import { MOCK_CAMERAS, MOCK_DETECTIONS, MOCK_ALERTS } from './mockData.js'

// Generic fetch helper
async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
  return res.json()
}

// ── Camera API ─────────────────────────────────────────────────
export const cameraAPI = {
  // GET /api/cameras → [ { id, name, location, status, useCase, alertCount, hlsUrl } ]
  getAll: () =>
    USE_MOCK
      ? Promise.resolve(MOCK_CAMERAS)
      : apiFetch('/api/cameras').then(d => d.cameras || d),

  // GET /api/cameras/:id → { id, name, ... }
  getById: (id) =>
    USE_MOCK
      ? Promise.resolve(MOCK_CAMERAS.find(c => c.id === id) || null)
      : apiFetch(`/api/cameras/${id}`),
}

// ── Detection API ───────────────────────────────────────────────
export const detectionAPI = {
  // GET /api/detections/:type → [ { id, cameraId, cameraName, type, label, value, confidence, severity, timestamp } ]
  getByType: (type) =>
    USE_MOCK
      ? Promise.resolve(MOCK_DETECTIONS[type] || [])
      : apiFetch(`/api/detections/${type}`).then(d => d.detections || d),

  // GET /api/detections/live?camera_id=cam-01
  // → [ { id, label, x, y, w, h, confidence, plate, speedVal } ]
  // (sirf USE_MOCK=false mein use hoga — mock mein websocket.js handle karta hai)
  getLive: (cameraId) =>
    apiFetch(`/api/detections/live?camera_id=${cameraId}`).then(d => d.detections || d),
}

// ── Alert API ───────────────────────────────────────────────────
export const alertAPI = {
  // GET /api/alerts → [ { id, type, cameraId, message, severity, acknowledged, timestamp } ]
  getAll: () =>
    USE_MOCK
      ? Promise.resolve(MOCK_ALERTS)
      : apiFetch('/api/alerts').then(d => d.alerts || d),

  // PATCH /api/alerts/:id/acknowledge → { id, acknowledged: true }
  acknowledge: (id) =>
    USE_MOCK
      ? Promise.resolve({ id, acknowledged: true })
      : fetch(`${API_BASE}/api/alerts/${id}/acknowledge`, { method: 'PATCH' }).then(r => r.json()),

  acknowledgeAll: () =>
    USE_MOCK
      ? Promise.resolve({ acknowledged: true })
      : fetch(`${API_BASE}/api/alerts/acknowledge-all`, { method: 'POST' }).then(r => r.json()),
}

// ── Report API ──────────────────────────────────────────────────
export const reportAPI = {
  generate: (params) =>
    USE_MOCK
      ? Promise.resolve(Object.values(MOCK_DETECTIONS).flat())
      : apiFetch(`/api/reports/generate?${new URLSearchParams(params)}`).then(d => d.detections || d),
}
