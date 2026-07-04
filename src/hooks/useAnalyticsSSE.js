// ══════════════════════════════════════════════════════════════
//  useAnalyticsSSE — Convenience hooks for each SSE endpoint
//
//  Backend SSE endpoints:
//    GET /api/sse/analytics/{camera_id}  → event: "analytics"
//    GET /api/sse/traffic/{camera_id}    → event: "traffic"
//    GET /api/sse/people/{camera_id}     → event: "people"
//    GET /api/sse/alerts?tenant_id=X     → event: "alert"
//    GET /api/sse/system                 → event: "system"
//    GET /api/sse/lpr/{camera_id}        → event: "lpr"
//    GET /ingest/alerts/stream?tenant_id → event: "alert"  (legacy)
// ══════════════════════════════════════════════════════════════

import { useSSE } from './useSSE.js'

const BASE_URL = import.meta.env.VITE_API_URL || ''

// ── Camera-level analytics (generic) ──────────────────────────
// data shape: { camera_id, usecase, timestamp, data: {...} }
export function useCameraAnalyticsSSE(cameraId) {
  const url = cameraId ? `${BASE_URL}/api/sse/analytics/${cameraId}` : null
  return useSSE(url, 'analytics', null)
}

// ── Traffic analytics ──────────────────────────────────────────
// data shape: TrafficAnalyticsResponse
export function useTrafficSSE(cameraId) {
  const url = cameraId ? `${BASE_URL}/api/sse/traffic/${cameraId}` : null
  return useSSE(url, 'traffic', null)
}

// ── People analytics ───────────────────────────────────────────
// data shape: PeopleAnalyticsResponse
export function usePeopleSSE(cameraId) {
  const url = cameraId ? `${BASE_URL}/api/sse/people/${cameraId}` : null
  return useSSE(url, 'people', null)
}

// ── Live alerts feed ───────────────────────────────────────────
// data: accumulates — new alerts prepended, max 100 kept
// data shape: LiveAlertItem[]
export function useAlertsSSE(tenantId = 'tenant_demo') {
  const url = `${BASE_URL}/api/sse/alerts?tenant_id=${tenantId}`
  return useSSE(url, 'alert', [], true)  // accumulate = true
}

// ── Legacy alert stream (ingest service) ──────────────────────
export function useLegacyAlertsSSE(tenantId = 'tenant_demo') {
  const url = `${BASE_URL}/ingest/alerts/stream?tenant_id=${tenantId}`
  return useSSE(url, 'alert', [], true)
}

// ── System overview ────────────────────────────────────────────
// data shape: SystemOverviewResponse
export function useSystemSSE() {
  const url = `${BASE_URL}/api/sse/system`
  return useSSE(url, 'system', null)
}

// ── Vehicle count (aggregated) ─────────────────────────────────
// data shape: { camera_id, total, in, out, timestamp, ... }
// event name: "vehicles"
export function useVehiclesSSE(cameraId) {
  const url = cameraId ? `${BASE_URL}/api/sse/vehicles/${cameraId}` : null
  return useSSE(url, 'vehicles', null)
}

// ── LPR feed ───────────────────────────────────────────────────
// data shape: LPRAnalyticsResponse
export function useLPRSSE(cameraId) {
  const url = cameraId ? `${BASE_URL}/api/sse/lpr/${cameraId}` : null
  return useSSE(url, 'lpr', null)
}
