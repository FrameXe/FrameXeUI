// ══════════════════════════════════════════════════════════════
//  API SERVICE
//
//  USE_MOCK = true  → mock data (no server needed)
//  USE_MOCK = false → real backend
//
//  Production API contract:
//
//  GET  /api/cameras
//    → { cameras: [{ id, name, location, latitude, longitude,
//                    status, enabled_usecases, hls_url }] }
//    hls_url is INLINE — no separate stream call needed
//
//  GET  /api/cameras/{id}/detections/{usecase}
//    → { timestamp, usecase, camera_id,
//        objects: [{ id, label, confidence, bbox:{x,y,width,height} }],
//        count }
//
//  GET  /api/cameras/{id}/alerts/{usecase}
//    → [{ id, type, message, timestamp, severity, usecase }]
//
//  POST /api/cameras/{id}/usecases
//    body: { use_cases: ["people_count", "traffic"] }
//
//  GET  /api/reports?camera_id=&usecase=&start_time=&end_time=
//    → { camera_id, usecase, start_time, end_time,
//        summary: { total_count, peak_hour, peak_count, average_per_hour },
//        timeline: [{ time, count }] }
// ══════════════════════════════════════════════════════════════

import { USE_MOCK, API_BASE, BEARER_TOKEN } from '../config/index.js'
import {
  MOCK_CAMERAS, MOCK_ALERTS, MOCK_SUMMARY, MOCK_EVENTS, MOCK_SESSIONS,
  genMockDetection, genMockReport, genMockPeopleAnalytics, ackGlobalAlert,
  genMockCongestion, genMockIllegalParking, genMockParkingMgmt, genMockPeopleCount,
  genMockSpeeding, genMockVehicleCount, genMockWrongWay
} from './mockData.js'

// ── HTTP helper ───────────────────────────────────────────────
async function api(path, opts = {}) {
  const url = `${API_BASE}${path}`
  console.log(`[API] Fetching: ${url}`)
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Tunnel-Skip-AntiPhishing-Page': 'true',
      ...(opts.headers || {}),
    },
    credentials: 'include',
    signal: opts.signal ?? AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} — ${path}${txt ? ': ' + txt : ''}`)
  }
  return res.json()
}

function qs(params) {
  const p = Object.entries(params).filter(([, v]) => v != null && v !== '')
  return p.length ? '?' + new URLSearchParams(p).toString() : ''
}

// ── Camera normalizer ─────────────────────────────────────────
// camera_id is the primary identifier — shown everywhere in UI
function normalizeCamera(c) {
  const hlsUrl = c.hls_url || c.hlsUrl || c.metadata?.hls_url || (null)
  const useCases = Array.isArray(c.enabled_usecases) ? c.enabled_usecases : 
                   (Array.isArray(c.assigned_use_cases) ? c.assigned_use_cases : 
                   (Array.isArray(c.use_cases) ? c.use_cases : (c.use_cases ? [c.use_cases] : [])))

  return {
    id: c.camera_id || c.id,
    name: c.name || c.camera_id || c.id,
    location: c.location || c.location_id || c.camera_location || '',
    latitude: c.latitude,
    longitude: c.longitude,
    status: c.status || 'active',
    useCase: useCases[0] || 'people_count',
    useCases: useCases,
    enabled_usecases: useCases,
    alertCount: c.alert_count || 0,
    hlsUrl,
  }
}

// ── Alert normalizer ──────────────────────────────────────────
function normalizeAlert(a, cam = {}) {
  return {
    id: a.id || a.alert_id,
    type: a.type || a.usecase || 'alert',
    cameraId: a.cameraId || cam.id || '',
    cameraName: a.cameraName || cam.name || '',
    location: a.location || cam.location || '',
    message: a.message || 'Alert',
    severity: a.severity || 'medium',
    acknowledged: a.acknowledged || false,
    timestamp: a.timestamp || a.created_at || new Date().toISOString(),
    usecase: a.usecase || a.type || '',
  }
}

// ════════════════════════════════════════════════════════════
//  CAMERA API
// ════════════════════════════════════════════════════════════
export const cameraAPI = {

  // GET /api/cameras
  // hls_url, location, status — sab ek call mein
  getAll: () =>
    USE_MOCK
      ? Promise.resolve(MOCK_CAMERAS.map(normalizeCamera))
      : api('/api/cameras/ui')
          .catch(() => api('/api/cameras'))   // fallback if /ui not deployed yet
          .then(d => {
            const list = Array.isArray(d) ? d : (d.cameras || d.data || [])
            return list.map(normalizeCamera)
          }),

  // POST /cameras/register
  register: (body) =>
    USE_MOCK
      ? Promise.resolve({ status: 'registered', camera_id: body.camera_id })
      : api('/cameras/register', { method: 'POST', body: JSON.stringify(body) }),

  // POST /api/cameras/{camera_id}/usecases
  assignUseCases: (id, use_cases) =>
    USE_MOCK
      ? Promise.resolve({ success: true, camera_id: id, enabled_usecases: use_cases })
      : api(`/api/cameras/${id}/usecases`, { method: 'POST', body: JSON.stringify(use_cases) }),

  // ── ROI / Detection Area Config ───────────────────────────

  // GET /api/cameras/{camera_id}/config
  // → { camera_id, roi_area: [{x, y}, ...] }
  // roi_area empty array means no zone set (detect full frame)
  getROI: (cameraId) =>
    USE_MOCK
      ? Promise.resolve({ camera_id: cameraId, roi_area: [] })
      : api(`/api/cameras/${cameraId}/config`),

  // POST /api/cameras/{camera_id}/config
  // body: { camera_id, roi_area: [{x:0.0-1.0, y:0.0-1.0}, ...] }
  // → { success: true, message: "..." }
  saveROI: (cameraId, roiPoints) =>
    USE_MOCK
      ? Promise.resolve({ success: true, message: 'ROI saved (mock)' })
      : api(`/api/cameras/${cameraId}/config`, {
          method: 'POST',
          body: JSON.stringify({
            camera_id: cameraId,
            roi_area: roiPoints, // normalized 0.0-1.0 points array
          }),
        }),
}

// ════════════════════════════════════════════════════════════
//  DETECTION API
// ════════════════════════════════════════════════════════════
export const detectionAPI = {

  // GET /api/cameras/{camera_id}/detections/{usecase}
  // → { timestamp, usecase, camera_id,
  //     objects:[{id, label, confidence, bbox:{x,y,width,height}}], count }
  get: (cameraId, usecase) =>
    USE_MOCK
      ? Promise.resolve(genMockDetection(cameraId, usecase))
      : api(`/api/cameras/${cameraId}/detections/${usecase}`),
}

// ════════════════════════════════════════════════════════════
//  ALERTS API  →  /api/alerts
// ════════════════════════════════════════════════════════════
export const alertAPI = {
  // GET /api/alerts/live — primary feed, filters by camera / usecase / acknowledged
  getLive: (params = {}) =>
    USE_MOCK
      ? Promise.resolve(MOCK_ALERTS.map(a => normalizeAlert(a)))
      : api(`/api/alerts/live${qs(params)}`).then(d => (Array.isArray(d) ? d : d.alerts || []).map(a => normalizeAlert(a))),

  // Per-camera per-usecase filter (uses getLive under the hood)
  getForCamera: (cameraId, usecase) =>
    alertAPI.getLive({ camera_id: cameraId, ...(usecase ? { usecase } : {}) }),

  getAllForCamera: (cameraId, usecases = [], camMeta = {}) =>
    alertAPI.getLive({ camera_id: cameraId }),

  // PATCH /api/alerts/{alert_id}/acknowledge
  acknowledge: (alertId) => {
    if (USE_MOCK) {
      ackGlobalAlert('', alertId)
      return Promise.resolve({ success: true })
    }
    return api(`/api/alerts/${alertId}/acknowledge`, { method: 'PATCH' })
  },
}

// ════════════════════════════════════════════════════════════
//  REPORTS API  →  /api/reports
// ════════════════════════════════════════════════════════════
export const reportAPI = {
  // GET /api/reports?camera_id=&usecase=&start_time=&end_time=
  get: (params = {}) =>
    USE_MOCK
      ? Promise.resolve(genMockReport(params.camera_id, params.usecase, params.start_time, params.end_time))
      : api(`/api/reports${qs(params)}`),
}

// ════════════════════════════════════════════════════════════
//  SYSTEM OVERVIEW API  →  /api/system
// ════════════════════════════════════════════════════════════
export const systemAPI = {
  // GET /api/system/overview — dashboard big-number cards
  getOverview: () =>
    USE_MOCK
      ? Promise.resolve(MOCK_SUMMARY)
      : api('/api/system/overview'),
}

// ════════════════════════════════════════════════════════════
//  ANALYTICS API  →  /api/analytics
// ════════════════════════════════════════════════════════════
export const analyticsAPI = {
  // GET /api/analytics/traffic/{camera_id}
  getTraffic: (cameraId) =>
    USE_MOCK ? Promise.resolve(genMockCongestion(cameraId)) : api(`/api/analytics/traffic/${cameraId}`),

  // GET /api/analytics/people/{camera_id}
  getPeople: (cameraId) =>
    USE_MOCK ? Promise.resolve(genMockPeopleCount(cameraId)) : api(`/api/analytics/people/${cameraId}`),

  // GET /analytics/events -- Historical forensic events
  getEvents: (params = {}) => USE_MOCK ? Promise.resolve(MOCK_EVENTS) : api(`/analytics/events${qs(params)}`),

  // GET /analytics/history -- Aggregate historical charts
  getHistory: (params = {}) => USE_MOCK ? Promise.resolve({ data: [], total: 0, page: 1, page_size: 20 }) : api(`/analytics/history${qs(params)}`),

  // Legacy compat
  getSummary: (params = {}) => USE_MOCK ? Promise.resolve(MOCK_SUMMARY) : api('/api/system/overview'),
}

// ════════════════════════════════════════════════════════════
//  LPR API  →  /api/lpr
// ════════════════════════════════════════════════════════════
export const lprAPI = {
  // GET /api/lpr/{camera_id} — live snapshot
  getLive: (cameraId) =>
    USE_MOCK ? Promise.resolve({}) : api(`/api/lpr/${cameraId}`),

  // GET /api/lpr/{camera_id}/history
  getHistory: (cameraId, params = {}) =>
    USE_MOCK ? Promise.resolve({ data: [], total: 0, page: 1, page_size: 20 }) : api(`/api/lpr/${cameraId}/history${qs(params)}`),

  // GET /api/lpr/search?plate=
  search: (params = {}) =>
    USE_MOCK ? Promise.resolve({ results: [], total: 0 }) : api(`/api/lpr/search${qs(params)}`),

  // GET /api/lpr/{camera_id}/watchlist
  getWatchlist: (cameraId) =>
    USE_MOCK ? Promise.resolve({ plates: [] }) : api(`/api/lpr/${cameraId}/watchlist`),

  // POST /api/lpr/{camera_id}/watchlist
  addToWatchlist: (cameraId, body) =>
    USE_MOCK ? Promise.resolve({ message: 'Added' }) : api(`/api/lpr/${cameraId}/watchlist`, { method: 'POST', body: JSON.stringify(body) }),

  // DELETE /api/lpr/{camera_id}/watchlist/{plate}
  removeFromWatchlist: (cameraId, plate) =>
    USE_MOCK ? Promise.resolve({ removed: true }) : api(`/api/lpr/${cameraId}/watchlist/${plate}`, { method: 'DELETE' }),
}

export const sessionAPI = {
  getAll: (p = {}) => USE_MOCK ? Promise.resolve(MOCK_SESSIONS) : api(`/sessions${qs({ page: 1, ...p })}`),
  getStats: (p = {}) => USE_MOCK ? Promise.resolve({ avg_dwell_seconds: 0, max_dwell_seconds: 0, session_count: 0 }) : api(`/sessions/stats${qs(p)}`),
}

// ════════════════════════════════════════════════════════════
//  PEOPLE ANALYTICS API  (Alert Detail Panel)
// ════════════════════════════════════════════════════════════
export const peopleAnalyticsAPI = {
  // Returns current in-frame count, daily total, peak hour, capacity status, hourly timeline
  get: (cameraId) =>
    USE_MOCK
      ? Promise.resolve(genMockPeopleAnalytics(cameraId))
      : (async () => {
        const [det, report] = await Promise.allSettled([
          api(`/api/cameras/${cameraId}/detections/people_count`),
          api(`/api/reports${qs({
            camera_id: cameraId, usecase: 'people_count',
            start_time: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
            end_time: new Date().toISOString()
          })}`),
        ])
        const currentInFrame = det.status === 'fulfilled' ? (det.value.count || 0) : 0
        const rpt = report.status === 'fulfilled' ? report.value : {}
        const capacityLimit = 20
        return {
          cameraId,
          currentInFrame,
          totalToday: rpt.summary?.total_count || 0,
          peakHour: rpt.summary?.peak_hour || '--',
          peakCount: rpt.summary?.peak_count || 0,
          avgPerHour: rpt.summary?.average_per_hour || 0,
          capacityLimit,
          capacityStatus: currentInFrame > capacityLimit ? 'critical' : currentInFrame > capacityLimit * 0.7 ? 'warning' : 'ok',
          hourlyTimeline: rpt.timeline || [],
        }
      })(),
}

// ════════════════════════════════════════════════════════════
//  TRAFFIC INTEGRATION API
// ════════════════════════════════════════════════════════════
export const trafficAPI = {
  // GET /api/analytics/traffic/{camera_id} — Unified snapshot
  getTrafficSnapshot: (cameraId) =>
    USE_MOCK ? Promise.resolve(genMockCongestion(cameraId)) : api(`/api/analytics/traffic/${cameraId}`),

  getPeopleCount: (cameraId) =>
    USE_MOCK ? Promise.resolve(genMockPeopleCount(cameraId)) : api(`/api/analytics/people/${cameraId}`),

  // Compatibility (maps to unified if needed)
  getCongestion: (cameraId) => trafficAPI.getTrafficSnapshot(cameraId),
  getVehicleCount: (cameraId) => trafficAPI.getTrafficSnapshot(cameraId),
  getSpeeding: (cameraId) => trafficAPI.getTrafficSnapshot(cameraId),
  getWrongWay: (cameraId) => trafficAPI.getTrafficSnapshot(cameraId),
}

// ════════════════════════════════════════════════════════════
//  LIVE STREAM TRACKER API (Safety Center UI)
// ════════════════════════════════════════════════════════════
export const trackerAPI = {
  getLiveEvents: (cameraId, usecase) => {
    // Generates the raw detection payload for the live scrolling trackers.
    // When USE_MOCK = false, it seamlessly forwards the request to the real API endpoint.
    return USE_MOCK
      ? Promise.resolve({ detections: [genLiveDet(cameraId, usecase)] })
      : api(`/api/cameras/${cameraId}/detections/${usecase}`)
  }
}