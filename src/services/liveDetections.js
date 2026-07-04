// ══════════════════════════════════════════════════════════════
//  LIVE DETECTION FEED — SSE (Server-Sent Events)
//
//  Endpoint: /api/sse/cameras/{id}/detections/{usecase}
//  e.g.    : /api/sse/cameras/vid_cam_001/detections/vehicle_count
//
//  Backend sends SSE events. Event name can be:
//    • named  → e.g.  event: vehicle_count  (or the usecase string)
//    • unnamed → plain `data:` messages (caught by 'message')
//
//  Payload shape (expected):
//    { timestamp, usecase, objects:[{id,label,confidence,bbox:{x,y,width,height}}], count }
//  bbox in pixel coords matching ORIG_W × ORIG_H
// ══════════════════════════════════════════════════════════════

import { sseManager } from '../lib/sseManager.js'
import { UC_CANVAS }  from '../constants/useCases.js'

const getColor = uc => UC_CANVAS[uc]?.color || '#00cfff'
const getLabel = uc => UC_CANVAS[uc]?.label || 'Object'

// ── Normalize one detection object → canvas shape ────────────
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

// ── Normalize a full SSE payload ──────────────────────────────
function normPayload(data, usecase) {
  // data could be an array of objects OR { objects: [...], count, ... }
  const list = Array.isArray(data)
    ? data
    : (data.objects ?? data.detections ?? [])
  return list.map(obj => normObject(obj, usecase))
}

// ── Map frontend usecase → backend usecase slug ───────────────
// 'traffic' on frontend == 'vehicle_count' on backend
function toBackendUsecase(uc) {
  if (uc === 'traffic') return 'vehicle_count'
  return uc
}

// ── SSE Detection Feed ────────────────────────────────────────
// Subscribes to the SSE stream for one camera + usecase.
// onDetection(normObject) is called for each detected object.
// Returns stop() function.
function startSseFeed(camera, usecase, onDetection) {
  const backendUc = toBackendUsecase(usecase)
  const url = `/api/sse/cameras/${camera.id}/detections/${backendUc}`

  // Backend may send named events (e.g. event: vehicle_count)
  // or plain unnamed `data:` messages → both handled below
  const handleData = (data) => {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      normPayload(parsed, usecase).forEach(obj => onDetection(obj))
    } catch (err) {
      console.warn(`[Detections SSE] Parse error ${camera.id}/${usecase}:`, err)
    }
  }

  // Subscribe to named event (usecase slug) AND generic 'message' fallback
  const unsub1 = sseManager.subscribe(url, backendUc, handleData)
  const unsub2 = sseManager.subscribe(url, 'message',  handleData)
  // Some backends emit 'detection' as the event name
  const unsub3 = sseManager.subscribe(url, 'detection', handleData)

  console.log(`[Detections SSE] Subscribing: ${url}`)

  return () => {
    unsub1()
    unsub2()
    unsub3()
  }
}

// ── Public API ────────────────────────────────────────────────
export function startLiveFeed(camera, usecase, onDetection) {
  if (!camera || camera.status !== 'active' || !usecase) return () => {}
  return startSseFeed(camera, usecase, onDetection)
}

export function startMultiUsecaseFeed(camera, usecases, onDetection) {
  if (!camera || camera.status !== 'active' || !usecases?.length) return () => {}
  const stops = usecases.map(uc => startLiveFeed(camera, uc, onDetection))
  return () => stops.forEach(fn => fn())
}

// Status helper — tells caller what the SSE connection state is
// Returns: 'connected' | 'connecting' | 'disconnected'
export function getSseStatus(cameraId, usecase) {
  const backendUc = toBackendUsecase(usecase)
  const url = `/api/sse/cameras/${cameraId}/detections/${backendUc}`
  const state = sseManager.getStatus(url)
  if (state === 1) return 'connected'
  if (state === 0) return 'connecting'
  return 'disconnected'
}

export function onWsStatus(cb) {
  cb('sse')
  return () => {}
}