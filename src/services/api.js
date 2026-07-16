// ══════════════════════════════════════════════════════════════
//  API SERVICE — Real backend only
//
//  Base URL is set via Vite proxy → http://13.60.162.231:8000
//
//  GET  /api/cameras/ui  (or /api/cameras)
//  GET  /api/cameras/{id}/detections/{usecase}
//  GET  /api/alerts/live?camera_id=&usecase=
//  PATCH /api/alerts/{id}/acknowledge
//  GET  /api/cameras/{id}/config
//  POST /api/cameras/{id}/config
//  GET  /api/reports?camera_id=&usecase=&start_time=&end_time=
//  GET  /api/system/overview
//  GET  /api/analytics/traffic/{id}
//  GET  /api/analytics/people/{id}
//  GET  /api/lpr/{id} ...
// ══════════════════════════════════════════════════════════════

import { API_BASE, BEARER_TOKEN } from '../config/index.js'

// ── HTTP helper ───────────────────────────────────────────────
async function api(path, opts = {}) {
  const url = `${API_BASE}${path}`
  console.log(`[API] Fetching: ${url}`)
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(BEARER_TOKEN ? { 'Authorization': `Bearer ${BEARER_TOKEN}` } : {}),
      ...(opts.headers || {}),
    },
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
function normalizeCamera(c) {
  let useCases = Array.isArray(c.enabled_usecases) ? c.enabled_usecases
    : Array.isArray(c.assigned_use_cases) ? c.assigned_use_cases
    : Array.isArray(c.use_cases) ? c.use_cases
    : c.use_cases ? [c.use_cases] : []

  // Map 'traffic' and 'vehicle_count' interchangeably on the frontend
  if (useCases.includes('traffic') && !useCases.includes('vehicle_count')) {
    useCases = [...useCases, 'vehicle_count']
  } else if (useCases.includes('vehicle_count') && !useCases.includes('traffic')) {
    useCases = [...useCases, 'traffic']
  }

  return {
    id:               c.camera_id || c.id,
    camera_id:        c.camera_id || c.id,
    name:             c.name || c.camera_id || c.id,
    location:         c.location || c.location_id || c.camera_location || '',
    latitude:         c.latitude,
    longitude:        c.longitude,
    status:           c.status || 'active',
    useCase:          useCases[0] === 'vehicle_count' ? 'traffic' : (useCases[0] || 'people_count'),
    useCases,
    enabled_usecases: useCases,
    alertCount:       c.alert_count || 0,
    hlsUrl:           c.hls_url || c.hlsUrl || null,
  }
}

// ── Alert normalizer ──────────────────────────────────────────
// Backend se aane wale usecases ko frontend UC ids pe map karo.
// Backend bhejta hai: vehicle_count, wrong_way, congestion, speeding, illegal_parking
// Frontend mein sab → 'traffic' id pe map hote hain (useCases.js mein id: 'traffic')
const BACKEND_TO_FRONTEND_UC = {
  vehicle_count:   'traffic',
  wrong_way:       'traffic',
  congestion:      'traffic',
  speeding:        'traffic',
  illegal_parking: 'traffic',
  people_count:    'people_count',
  license_plate:   'traffic',   // LPR bhi traffic suite mein dikh sakta hai
  crowd_alert:     'crowd_alert',
  intrusion:       'intrusion',
  vehicle_speed:   'vehicle_speed',
}

export function normalizeAlert(a, cam = {}) {
  const rawUc = a.usecase || a.type || ''
  const uc    = BACKEND_TO_FRONTEND_UC[rawUc] ?? rawUc

  // Snapshot URLs from the backend are absolute (built from request.base_url).
  // If they ever arrive relative ("/api/snapshots/..."), prefix with API_BASE.
  const toAbs = (u) => {
    if (!u) return null
    return /^https?:\/\//i.test(u) ? u : `${API_BASE}${u.startsWith('/') ? '' : '/'}${u}`
  }
  const thumbnailUrl = toAbs(a.thumbnail_url || a.thumbnailUrl)
  const fullResUrl   = toAbs(a.full_res_url || a.fullResUrl || a.snapshot_url)

  return {
    id:           a.id || a.alert_id,
    type:         uc,
    cameraId:     a.camera_id || a.cameraId || cam.id || '',
    cameraName:   a.cameraName || a.camera_name || cam.name || '',
    location:     a.location || cam.location || '',
    message:      a.message || 'Alert',
    severity:     (a.severity || 'medium').toLowerCase(),
    acknowledged: a.acknowledged || false,
    timestamp:    a.timestamp || a.created_at || new Date().toISOString(),
    usecase:      uc,
    rawUsecase:   rawUc,   // original backend usecase — debugging ke liye
    thumbnailUrl,
    fullResUrl,
  }
}

// ════════════════════════════════════════════════════════════
//  CAMERA API
// ════════════════════════════════════════════════════════════
export const cameraAPI = {

  // GET /api/cameras/ui  (fallback: /api/cameras)
  getAll: () =>
    api('/api/cameras/ui')
      .catch(() => api('/api/cameras'))
      .then(d => {
        const list = Array.isArray(d) ? d : (d.cameras || d.data || [])
        return list.map(normalizeCamera)
      }),

  // POST /cameras/register
  register: (body) =>
    api('/cameras/register', { method: 'POST', body: JSON.stringify(body) }),

  // POST /api/cameras/{id}/usecases
  assignUseCases: (id, use_cases) =>
    api(`/api/cameras/${id}/usecases`, { method: 'POST', body: JSON.stringify(use_cases) }),

  // GET /api/cameras/{id}/config
  getROI: (cameraId) =>
    api(`/api/cameras/${cameraId}/config`),

  // POST /api/cameras/{id}/config
  saveROI: (cameraId, roiPoints) =>
    api(`/api/cameras/${cameraId}/config`, {
      method: 'POST',
      body: JSON.stringify({ camera_id: cameraId, roi_area: roiPoints }),
    }),
}

// ════════════════════════════════════════════════════════════
//  DETECTION API
//
//  Live stream  → SSE  /api/sse/cameras/{id}/detections/{usecase}
//                      (handled by liveDetections.js via sseManager)
//
//  Snapshot REST → GET /api/cameras/{id}/detections/{usecase}
//                      (one-time fetch, e.g. for reports/widgets)
// ════════════════════════════════════════════════════════════
export const detectionAPI = {
  // One-time snapshot — not used for live canvas (use liveDetections.js for that)
  get: (cameraId, usecase) =>
    api(`/api/cameras/${cameraId}/detections/${usecase === 'traffic' ? 'vehicle_count' : usecase}`),

  // SSE URL builder — pass to sseManager.subscribe() if needed manually
  sseUrl: (cameraId, usecase) =>
    `/api/sse/cameras/${cameraId}/detections/${usecase === 'traffic' ? 'vehicle_count' : usecase}`,
}

// ════════════════════════════════════════════════════════════
//  ALERTS API
// ════════════════════════════════════════════════════════════
export const alertAPI = {
  // GET /api/alerts/live
  getLive: (params = {}) =>
    api(`/api/alerts/live${qs(params)}`)
      .then(d => (Array.isArray(d) ? d : d.alerts || []).map(a => normalizeAlert(a))),

  getForCamera: (cameraId, usecase) =>
    alertAPI.getLive({ camera_id: cameraId, ...(usecase ? { usecase: usecase === 'traffic' ? 'vehicle_count' : usecase } : {}) }),

  getAllForCamera: (cameraId) =>
    alertAPI.getLive({ camera_id: cameraId }),

  // PATCH /api/alerts/{id}/acknowledge
  acknowledge: (alertId) =>
    api(`/api/alerts/${alertId}/acknowledge`, { method: 'PATCH' }),
}

// ════════════════════════════════════════════════════════════
//  REPORTS API
// ════════════════════════════════════════════════════════════
export const reportAPI = {
  // GET /api/reports?camera_id=&usecase=&start_time=&end_time=
  get: (params = {}) =>
    api(`/api/reports${qs(params)}`),
}

// ════════════════════════════════════════════════════════════
//  SYSTEM OVERVIEW API
// ════════════════════════════════════════════════════════════
export const systemAPI = {
  // GET /api/system/overview
  getOverview: () => api('/api/system/overview'),
}

// ════════════════════════════════════════════════════════════
//  ANALYTICS API
// ════════════════════════════════════════════════════════════
export const analyticsAPI = {
  getTraffic:  (cameraId)    => api(`/api/analytics/traffic/${cameraId}`),
  getPeople:   (cameraId)    => api(`/api/analytics/people/${cameraId}`),
  getEvents:   (params = {}) => api(`/analytics/events${qs(params)}`),
  getHistory:  (params = {}) => api(`/analytics/history${qs(params)}`),
  getSummary:  ()            => api('/api/system/overview'),
}

// ════════════════════════════════════════════════════════════
//  LPR API
// ════════════════════════════════════════════════════════════
export const lprAPI = {
  getLive:             (cameraId)         => api(`/api/lpr/${cameraId}`),
  getHistory:          (cameraId, p = {}) => api(`/api/lpr/${cameraId}/history${qs(p)}`),
  search:              (p = {})           => api(`/api/lpr/search${qs(p)}`),
  getWatchlist:        (cameraId)         => api(`/api/lpr/${cameraId}/watchlist`),
  addToWatchlist:      (cameraId, body)   => api(`/api/lpr/${cameraId}/watchlist`, { method: 'POST', body: JSON.stringify(body) }),
  removeFromWatchlist: (cameraId, plate)  => api(`/api/lpr/${cameraId}/watchlist/${plate}`, { method: 'DELETE' }),
}

// ════════════════════════════════════════════════════════════
//  SESSIONS API
// ════════════════════════════════════════════════════════════
export const sessionAPI = {
  getAll:   (p = {}) => api(`/sessions${qs({ page: 1, ...p })}`),
  getStats: (p = {}) => api(`/sessions/stats${qs(p)}`),
}

// ════════════════════════════════════════════════════════════
//  PEOPLE ANALYTICS (combines detections + reports)
// ════════════════════════════════════════════════════════════
export const peopleAnalyticsAPI = {
  get: async (cameraId) => {
    const [det, report] = await Promise.allSettled([
      api(`/api/cameras/${cameraId}/detections/people_count`),
      api(`/api/reports${qs({
        camera_id: cameraId,
        usecase: 'people_count',
        start_time: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        end_time: new Date().toISOString(),
      })}`),
    ])
    const currentInFrame = det.status === 'fulfilled' ? (det.value.count || 0) : 0
    const rpt = report.status === 'fulfilled' ? report.value : {}
    const capacityLimit = 20
    return {
      cameraId,
      currentInFrame,
      totalToday:     rpt.summary?.total_count      || 0,
      peakHour:       rpt.summary?.peak_hour        || '--',
      peakCount:      rpt.summary?.peak_count       || 0,
      avgPerHour:     rpt.summary?.average_per_hour || 0,
      capacityLimit,
      capacityStatus: currentInFrame > capacityLimit ? 'critical'
        : currentInFrame > capacityLimit * 0.7 ? 'warning' : 'ok',
      hourlyTimeline: rpt.timeline || [],
    }
  },
}

// ════════════════════════════════════════════════════════════
//  TRAFFIC API
// ════════════════════════════════════════════════════════════
export const trafficAPI = {
  getTrafficSnapshot: (cameraId) => api(`/api/analytics/traffic/${cameraId}`),
  getPeopleCount:     (cameraId) => api(`/api/analytics/people/${cameraId}`),
  getCongestion:      (cameraId) => trafficAPI.getTrafficSnapshot(cameraId),
  getVehicleCount:    (cameraId) => trafficAPI.getTrafficSnapshot(cameraId),
  getSpeeding:        (cameraId) => trafficAPI.getTrafficSnapshot(cameraId),
  getWrongWay:        (cameraId) => trafficAPI.getTrafficSnapshot(cameraId),
}

// ════════════════════════════════════════════════════════════
//  LIVE TRACKER API
// ════════════════════════════════════════════════════════════
export const trackerAPI = {
  getLiveEvents: (cameraId, usecase) =>
    api(`/api/cameras/${cameraId}/detections/${usecase}`),
}

// ════════════════════════════════════════════════════════════
//  LINE CROSSING API
// ════════════════════════════════════════════════════════════
export const lineAPI = {
  getCrossingCounts: (cameraId) => api(`/api/line/crossing/${cameraId}`),
  recordCrossing: (body) => api('/api/line/crossing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  resetCrossingCounts: (cameraId) => api(`/api/line/crossing/${cameraId}/reset`, {
    method: 'POST',
  }),
}