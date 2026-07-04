// ══════════════════════════════════════════════════════════════
//  useAlerts — SSE primary, REST one-time initial load
//
//  SSE:  GET /api/sse/alerts?tenant_id=X  → event: "alert"
//  REST: GET /api/alerts/live             → one-time on mount only
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { alertAPI, normalizeAlert } from '../services/api.js'
import { sseManager } from '../lib/sseManager.js'

const BASE_URL  = import.meta.env.VITE_API_URL  || ''
const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'tenant_demo'
const SSE_URL   = `${BASE_URL}/api/sse/alerts?tenant_id=${TENANT_ID}`

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

  // SSE — real-time new alerts
  useEffect(() => {
    if (!cameraId) return

    const unsub = sseManager.subscribe(SSE_URL, 'alert', (eventData) => {
      const a = normalizeAlert(eventData)
      const camId = a.cameraId
      if (camId !== cameraId) return
      if (usecase && a.usecase !== usecase) return

      setLoading(false)
      setConnected(true)
      setAlerts(prev => {
        if (prev.some(x => x.id === a.id)) return prev
        return [a, ...prev].slice(0, 100)
      })
    })

    return () => { unsub(); setConnected(false) }
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
      .then(d => setAlerts(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])  // empty deps = runs exactly once

  // SSE — all new real-time alerts
  useEffect(() => {
    const unsub = sseManager.subscribe(SSE_URL, 'alert', (eventData) => {
      const a = normalizeAlert(eventData)
      setConnected(true)
      setLoading(false)
      setAlerts(prev => {
        if (prev.some(x => x.id === a.id)) return prev
        return [a, ...prev].slice(0, 500)
      })
    })

    return () => { unsub(); setConnected(false) }
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