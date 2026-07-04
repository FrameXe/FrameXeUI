// ══════════════════════════════════════════════════════════════
//  Frame Delay Sync — cameraSync.js
//  Compensates for network and GPU pipeline delay by buffering
//  overlays to match browser video frame playhead time.
// ══════════════════════════════════════════════════════════════

import { API_BASE } from '../config/index.js'
import { sseManager } from './sseManager.js'

// Dev Tunnel specifically for the 3 sync endpoints
const SYNC_BASE = 'https://nz1pvxzc-8000.inc1.devtunnels.ms'

/**
 * Compute the client-server clock offset.
 * Call this ONCE on page load.
 */
export async function computeClockOffset() {
  const t0 = Date.now()
  try {
    const res = await fetch(`${SYNC_BASE}/api/sync/server-time`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { server_time_ms } = await res.json()
    const t1 = Date.now()
    const rtt = t1 - t0
    return server_time_ms + rtt / 2 - t1
  } catch (e) {
    console.warn('[CameraSync] Clock offset computation failed, using 0:', e)
    return 0
  }
}

/**
 * Fetch initial buffer_ms for one camera (cold-start fallback).
 */
export async function fetchCameraHealth(cameraId) {
  try {
    const res = await fetch(`${SYNC_BASE}/api/sync/camera-health/${cameraId}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    console.warn(`[CameraSync] camera-health fetch failed for ${cameraId}:`, e)
    return { camera_id: cameraId, buffer_ms: 2000, sample_count: 0 }
  }
}

/**
 * Fetch initial buffer_ms for multiple cameras in one call (dashboard cold-start).
 */
export async function fetchCameraHealthBatch(cameraIds) {
  if (!cameraIds || !cameraIds.length) return []
  try {
    const ids = cameraIds.join(',')
    const res = await fetch(`${SYNC_BASE}/api/sync/camera-health/batch?camera_ids=${ids}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    console.warn('[CameraSync] Batch camera-health fetch failed:', e)
    return cameraIds.map(id => ({ camera_id: id, buffer_ms: 2000, sample_count: 0 }))
  }
}

/**
 * CameraSync — per-camera overlay scheduler.
 */
export class CameraSync {
  constructor(cameraId, options = {}) {
    this.cameraId      = cameraId
    this.clockOffsetMs = options.clockOffsetMs ?? 0
    this.sseUrl        = options.sseUrl ?? `/api/sse/cameras/${cameraId}/detections/vehicle_count`
    this.sseEventName  = options.sseEventName ?? 'detection'
    this.healthPollMs  = options.healthPollMs ?? 5000

    // State
    this.bufferMs   = 2000  // cold-start default
    this.pending    = []    // [{ detection, showAt }]
    this.unsubSse   = null
    this._rafId     = null
    this._pollTimer = null
    this._started   = false

    // Callbacks
    this.onRender = null  // (detection) => void
    this.onStats  = null  // ({ delay_ms, buffer_ms }) => void
  }

  async start() {
    if (this._started) return
    this._started = true

    // 1. Fetch initial buffer_ms (cold start)
    const health = await fetchCameraHealth(this.cameraId)
    this.bufferMs = health.buffer_ms ?? 2000

    // 2. Start EventSource subscription via sseManager
    this._startEventStream()

    // 3. Poll health stats
    this._startHealthPolling()

    // 4. Render loop
    this._startRenderLoop()

    console.info(
      `[CameraSync] Started | cam=${this.cameraId} | buffer=${this.bufferMs}ms | offset=${this.clockOffsetMs}ms`
    )
  }

  destroy() {
    this._started = false
    this.unsubSse?.()
    this.unsubSse = null
    if (this._rafId != null) cancelAnimationFrame(this._rafId)
    if (this._pollTimer != null) clearInterval(this._pollTimer)
    this.pending = []
    console.info(`[CameraSync] Destroyed | cam=${this.cameraId}`)
  }

  _startEventStream() {
    const handleEvent = (payload) => {
      if (payload.camera_id && payload.camera_id !== this.cameraId) return

      // Update buffer value dynamically
      if (payload.buffer_ms != null) this.bufferMs = payload.buffer_ms

      // Stats callback for debugging
      this.onStats?.({ delay_ms: payload.delay_ms, buffer_ms: payload.buffer_ms })

      // Compute display release timestamp
      const alreadyElapsed = payload.delay_ms ?? 0
      const holdBack       = Math.max(0, this.bufferMs - alreadyElapsed)
      const showAt         = Date.now() + holdBack

      const detection = payload.objects ?? payload.data ?? payload
      this.pending.push({ detection, showAt })
    }

    // Subscribe to standard event names
    const u1 = sseManager.subscribe(this.sseUrl, this.sseEventName, handleEvent)
    const u2 = sseManager.subscribe(this.sseUrl, 'message',         handleEvent)
    this.unsubSse = () => { u1(); u2() }
  }

  _startHealthPolling() {
    this._pollTimer = setInterval(async () => {
      try {
        const data = await fetchCameraHealth(this.cameraId)
        if (data.buffer_ms != null && data.sample_count > 0) {
          this.bufferMs = data.buffer_ms
        }
      } catch (e) {
        // non-critical
      }
    }, this.healthPollMs)
  }

  _startRenderLoop() {
    const loop = () => {
      if (!this._started) return
      const now = Date.now()
      while (this.pending.length && this.pending[0].showAt <= now) {
        const item = this.pending.shift()
        this._render(item.detection)
      }
      this._rafId = requestAnimationFrame(loop)
    }
    this._rafId = requestAnimationFrame(loop)
  }

  _render(detection) {
    if (this.onRender) {
      this.onRender(detection)
    }
  }
}
