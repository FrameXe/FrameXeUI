// ══════════════════════════════════════════════════════════════
//  LIVE DETECTION FEED — Real API only
//
//  Polls GET /api/cameras/{id}/detections/{usecase} every POLL_MS
//  Response: { timestamp, usecase, objects:[{id,label,confidence,bbox:{x,y,width,height}}], count }
//  bbox is in pixel coordinates (matches ORIG_W x ORIG_H)
// ══════════════════════════════════════════════════════════════

import { API_BASE, POLL_MS } from '../config/index.js'
import { UC_CANVAS } from '../constants/useCases.js'

const getColor = uc => UC_CANVAS[uc]?.color || '#00cfff'
const getLabel = uc => UC_CANVAS[uc]?.label || 'Object'

// Normalize one object from detection response → canvas shape
function normObject(obj, usecase) {
  const bbox   = obj.bbox || {}
  const x      = bbox.x      ?? obj.x      ?? 0
  const y      = bbox.y      ?? obj.y      ?? 0
  const w      = bbox.width  ?? bbox.w     ?? obj.width  ?? obj.w ?? 0
  const h      = bbox.height ?? bbox.h     ?? obj.height ?? obj.h ?? 0
  const hasBbox = w > 0 && h > 0
  const conf   = obj.confidence ?? 0

  return {
    id:         obj.id || `obj-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    useCase:    usecase,
    color:      getColor(usecase),
    label:      obj.label || getLabel(usecase),
    confidence: conf > 1 ? Number(conf).toFixed(1) : (conf * 100).toFixed(1),
    speedVal:   obj.speed ?? null,
    x, y, w, h, hasBbox,
    age: 0, alpha: 1,
  }
}

// ── Real API polling ──────────────────────────────────────────
function startApiFeed(camera, usecase, onDetection) {
  let stopped = false

  const poll = async () => {
    if (stopped) return
    try {
      const url = `${API_BASE}/api/cameras/${camera.id}/detections/${usecase}`
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000),
      })
      if (!res.ok) throw new Error(res.status)
      const data    = await res.json()
      const objects = data.objects ?? data.detections ?? []
      objects.forEach(obj => onDetection(normObject(obj, usecase)))
    } catch (err) {
      console.warn(`[Detections] ${camera.id}/${usecase}:`, err.message)
    }
    if (!stopped) setTimeout(poll, POLL_MS)
  }

  poll()
  return () => { stopped = true }
}

// ── Public API ────────────────────────────────────────────────
export function startLiveFeed(camera, usecase, onDetection) {
  if (camera.status !== 'active' || !usecase) return () => {}
  return startApiFeed(camera, usecase, onDetection)
}

export function startMultiUsecaseFeed(camera, usecases, onDetection) {
  if (camera.status !== 'active' || !usecases?.length) return () => {}
  const stops = usecases.map(uc => startLiveFeed(camera, uc, onDetection))
  return () => stops.forEach(fn => fn())
}

export function onWsStatus(cb) {
  cb('polling')
  return () => {}
}