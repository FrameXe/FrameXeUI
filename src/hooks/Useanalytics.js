// ══════════════════════════════════════════════════════════════
//  Useanalytics — SSE-based (replaces polling)
//  traffic/people: GET /api/sse/traffic|people/{camera_id}
//  system:         GET /api/sse/system
//  events/reports: REST (one-time fetch, no streaming needed)
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { analyticsAPI, systemAPI, reportAPI } from '../services/api.js'
import { sseManager } from '../lib/sseManager.js'

const BASE_URL = import.meta.env.VITE_API_URL || ''

// ── System overview via SSE ───────────────────────────────────
export function useSummary() {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [connected, setConnected] = useState(false)

  // Initial REST load
  useEffect(() => {
    systemAPI.getOverview()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // SSE for real-time updates
  useEffect(() => {
    const url  = `${BASE_URL}/api/sse/system`
    const unsub = sseManager.subscribe(url, 'system', (d) => {
      setData(d)
      setConnected(true)
      setLoading(false)
    })
    return () => { unsub(); setConnected(false) }
  }, [])

  return { summary: data, loading, connected }
}

// ── Traffic analytics via SSE ─────────────────────────────────
export function useTrafficAnalytics(cameraId) {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [connected, setConnected] = useState(false)

  // Initial REST load
  useEffect(() => {
    if (!cameraId) return
    setLoading(true)
    analyticsAPI.getTraffic(cameraId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [cameraId])

  // SSE for real-time updates
  useEffect(() => {
    if (!cameraId) return
    const url   = `${BASE_URL}/api/sse/traffic/${cameraId}`
    const unsub = sseManager.subscribe(url, 'traffic', (d) => {
      setData(d)
      setConnected(true)
      setLoading(false)
    })
    return () => { unsub(); setConnected(false) }
  }, [cameraId])

  return { traffic: data, loading, connected }
}

// ── People analytics via SSE ──────────────────────────────────
export function usePeopleAnalytics(cameraId) {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [connected, setConnected] = useState(false)

  // Initial REST load
  useEffect(() => {
    if (!cameraId) return
    setLoading(true)
    analyticsAPI.getPeople(cameraId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [cameraId])

  // SSE for real-time
  useEffect(() => {
    if (!cameraId) return
    const url   = `${BASE_URL}/api/sse/people/${cameraId}`
    const unsub = sseManager.subscribe(url, 'people', (d) => {
      setData(d)
      setConnected(true)
      setLoading(false)
    })
    return () => { unsub(); setConnected(false) }
  }, [cameraId])

  return { people: data, loading, connected }
}

// ── Events feed — REST only (historical, no streaming needed) ──
export function useEvents(params = {}) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const key = JSON.stringify(params)

  useEffect(() => {
    setLoading(true)
    analyticsAPI.getEvents(params)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [key]) // eslint-disable-line

  return { events: data, loading }
}

// ── Reports — REST only (on-demand generate) ──────────────────
export function useReport(params = {}) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const generate = () => {
    if (!params.camera_id || !params.usecase) return
    setLoading(true); setError(null)
    reportAPI.get(params)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  return { report: data, loading, error, generate }
}