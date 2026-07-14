// ══════════════════════════════════════════════════════════════
//  useAlerts — SSE primary, REST one-time initial load
//
//  SSE:  GET /api/sse/alerts?tenant_id=X  → event: "alert"
//        Publisher: master_backend ingest.py → _publish_alerts_to_sse()
//        Payload shape: LiveAlertItem
//          { id, cameraId, cameraName, message, severity, usecase,
//            timestamp, thumbnail_url, full_res_url, acknowledged }
//
//  REST: GET /api/alerts/live             → one-time on mount only
//        Returns: same LiveAlertItem shape from MongoDB
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { alertAPI, normalizeAlert } from '../services/api.js'
import { sseManager } from '../lib/sseManager.js'

const BASE_URL  = import.meta.env.VITE_API_URL  || ''
const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'tenant_demo'

// SSE URL — connects to master_backend's /api/sse/alerts
// Publisher: ingest.py → _publish_alerts_to_sse() → Redis {tenant_id}:alerts
const SSE_URL = `${BASE_URL}/api/sse/alerts?tenant_id=${TENANT_ID}`

// ── Per-camera alerts ─────────────────────────────────────────
// Initial REST load + SSE real-time stream, filtered by cameraId
export function useCameraAlerts(cameraId, usecase) {
  const [alerts,    setAlerts]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [connected, setConnected] = useState(false)
  const didLoad = useRef(false)

  // ONE-TIME REST load on mount
  useEffect(() => {
    if (!cameraId || didLoad.current) return
    didLoad.current = true
    setLoading(true)
    alertAPI.getForCamera(cameraId, usecase)
      .then(d => setAlerts(Array.isArray(d) ? d : []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [cameraId, usecase])

  // SSE — real-time new alerts (from master_backend direct publish)
  useEffect(() => {
    if (!cameraId) return

    const handleAlert = (eventData) => {
      // eventData is already JSON-parsed by sseManager
      const raw = typeof eventData === 'string' ? JSON.parse(eventData) : eventData
      const a = normalizeAlert(raw)

      // Only show alerts for this camera
      if (a.cameraId !== cameraId) return
      if (usecase && a.usecase !== usecase && a.rawUsecase !== usecase) return

      setLoading(false)
      setConnected(true)
      setAlerts(prev => {
        if (prev.some(x => x.id === a.id)) return prev
        return [a, ...prev].slice(0, 100)
      })
    }

    // Subscribe to both 'alert' (named event) and 'message' (fallback)
    const unsub1 = sseManager.subscribe(SSE_URL, 'alert',   handleAlert)
    const unsub2 = sseManager.subscribe(SSE_URL, 'message', handleAlert)

    return () => { unsub1(); unsub2(); setConnected(false) }
  }, [cameraId, usecase])

  const ack = (alertId) => {
    alertAPI.acknowledge(alertId)
    setAlerts(p => p.map(a => a.id === alertId ? { ...a, acknowledged: true } : a))
  }

  return { alerts, loading, connected, ack }
}

// ── All alerts — Safety Center / Dashboard ────────────────────
// Initial REST load (ONE TIME) + SSE real-time stream
export function useAllAlerts(cameras = []) {
  const [alerts,    setAlerts]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [connected, setConnected] = useState(false)
  const didLoad = useRef(false)

  // ONE-TIME REST initial load — no polling, no interval
  useEffect(() => {
    if (didLoad.current) return
    didLoad.current = true
    setLoading(true)
    alertAPI.getLive({ limit: 200 })
      .then(d => {
        const normalized = (Array.isArray(d) ? d : []).map(a => normalizeAlert(a))
        setAlerts(normalized)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])  // empty deps = runs exactly once

  // SSE — all new real-time alerts from master_backend
  useEffect(() => {
    const handleAlert = (eventData) => {
      const raw = typeof eventData === 'string' ? JSON.parse(eventData) : eventData
      const a = normalizeAlert(raw)

      setConnected(true)
      setLoading(false)
      setAlerts(prev => {
        if (prev.some(x => x.id === a.id)) return prev
        return [a, ...prev].slice(0, 500)
      })
    }

    // Subscribe to both named 'alert' event and generic 'message' fallback
    const unsub1 = sseManager.subscribe(SSE_URL, 'alert',   handleAlert)
    const unsub2 = sseManager.subscribe(SSE_URL, 'message', handleAlert)

    return () => { unsub1(); unsub2(); setConnected(false) }
  }, [])  // subscribe once, singleton manages connection

  const ack = (cameraIdOrAlertId, alertIdOptional) => {
    const alertId = alertIdOptional ?? cameraIdOrAlertId
    alertAPI.acknowledge(alertId)
    setAlerts(p => p.map(a => a.id === alertId ? { ...a, acknowledged: true } : a))
  }

  // Filter to only cameras this user can see
  const cameraIds = cameras.map(c => c.id || c.camera_id)
  const filtered  = cameraIds.length > 0
    ? alerts.filter(a => cameraIds.includes(a.cameraId || a.camera_id))
    : alerts

  return {
    alerts:  filtered,
    loading,
    connected,
    ack,
    unread:  filtered.filter(a => !a.acknowledged).length,
  }
}