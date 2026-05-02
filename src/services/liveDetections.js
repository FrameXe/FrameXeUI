// ══════════════════════════════════════════════════════════════
//  LIVE DETECTION FEED
//
//  USE_MOCK = true  → mock data every 900ms
//  USE_MOCK = false → GET /api/cameras/{id}/detections/{usecase}
//                     polls every POLL_MS ms
//
//  Response shape: { timestamp, usecase, objects:[{id,label,confidence,bbox:{x,y,width,height}}], count }
//  bbox is in pixel coordinates (matches ORIG_W x ORIG_H)
// ══════════════════════════════════════════════════════════════

import { USE_MOCK, API_BASE, POLL_MS } from '../config/index.js'
import { genLiveDet } from './mockData.js'
import { UC_CANVAS } from '../constants/useCases.js'

const getColor = uc => UC_CANVAS[uc]?.color || '#00cfff'
const getLabel = uc => UC_CANVAS[uc]?.label || 'Object'

// Normalize one object from detection response → canvas shape
// bbox format: { x, y, width, height } in pixels
function normObject(obj, usecase) {
  const bbox = obj.bbox || {}
  const x = bbox.x ?? obj.x ?? 0
  const y = bbox.y ?? obj.y ?? 0
  const w = bbox.width ?? bbox.w ?? obj.width ?? obj.w ?? 0
  const h = bbox.height ?? bbox.h ?? obj.height ?? obj.h ?? 0
  const hasBbox = w > 0 && h > 0

  const conf = obj.confidence ?? 0

  return {
    id: obj.id || `obj-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    useCase: usecase,
    color: getColor(usecase),
    label: obj.label || getLabel(usecase),
    confidence: conf > 1 ? Number(conf).toFixed(1) : (conf * 100).toFixed(1),
    speedVal: obj.speed ?? null,
    x, y, w, h, hasBbox,
    age: 0, alpha: 1,
  }
}

// ── MOCK feed ─────────────────────────────────────────────────
function startMockFeed(camera, usecase, onDetection) {
  const iv = setInterval(() => {
    // genLiveDet returns a single object detection
    const obj = genLiveDet(camera.id)
    onDetection(normObject(obj, usecase))
  }, 900)
  return () => clearInterval(iv)
}

// ── REAL API polling ──────────────────────────────────────────
function startApiFeed(camera, usecase, onDetection) {
  let stopped = false

  const poll = async () => {
    if (stopped) return
    try {
      const url = `${API_BASE}/api/cameras/${camera.id}/detections/${usecase}`
      const res = await fetch(url, {
        headers: {
          'X-Tunnel-Skip-AntiPhishing-Page': 'true',
          'Accept': 'application/json',
        },
        credentials: 'include',
        signal: AbortSignal.timeout(4000),
      })
      if (!res.ok) {
        console.warn(`[Detections] ${url} → HTTP ${res.status}`)
        throw new Error(res.status)
      }
      const data = await res.json()
      const objects = data.objects ?? data.detections ?? []
      if (objects.length > 0) {
        console.debug(`[Detections] ${camera.id}/${usecase} → ${objects.length} objs`)
      }
      objects.forEach(obj => onDetection(normObject(obj, usecase)))
    } catch (err) {
      console.warn(`[Detections] poll error (${camera.id}/${usecase}):`, err.message)
    }
    if (!stopped) setTimeout(poll, POLL_MS)
  }

  poll()
  return () => { stopped = true }
}

// ── Public ────────────────────────────────────────────────────
// camera = { id, status, ... }
// usecase = selected usecase string e.g. 'people_count'
// onDetection = callback(det)
// returns stop function
export function startLiveFeed(camera, usecase, onDetection) {
  if (camera.status !== 'active') return () => { }
  if (!usecase) return () => { }

  if (USE_MOCK) {
    return startMockFeed(camera, usecase, onDetection)
  } else {
    return startApiFeed(camera, usecase, onDetection)
  }
}

// ── Multi-usecase feed ────────────────────────────────────────
// Spins up one feed per usecase, all running simultaneously
// Each detection carries its useCase field for color/label mapping
// Returns a single stop function
export function startMultiUsecaseFeed(camera, usecases, onDetection) {
  if (camera.status !== 'active' || !usecases || usecases.length === 0) {
    return () => {}
  }
  const stops = usecases.map(uc => startLiveFeed(camera, uc, onDetection))
  return () => stops.forEach(fn => fn())
}

export function onWsStatus(cb) {
  cb(USE_MOCK ? 'mock' : 'polling')
  return () => { }
}