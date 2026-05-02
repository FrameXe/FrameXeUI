import { useState, useEffect, useCallback } from 'react'
import { alertAPI } from '../services/api.js'

// GET /api/alerts/live?camera_id=&usecase= — per camera per usecase
export function useCameraAlerts(cameraId, usecase) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    if (!cameraId) return
    setLoading(true)
    alertAPI.getForCamera(cameraId, usecase)
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [cameraId, usecase])

  useEffect(() => {
    load()
    const intv = setInterval(load, 3000)
    return () => clearInterval(intv)
  }, [load])

  const ack = (alertId) => {
    alertAPI.acknowledge(alertId)
    setAlerts(p => p.map(a => a.id === alertId ? { ...a, acknowledged: true } : a))
  }

  return { alerts, loading, ack, refresh: load }
}

// GET /api/alerts/live — single endpoint for ALL cameras, much faster
export function useAllAlerts(cameras = []) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    alertAPI.getLive({ limit: 200 })
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const intv = setInterval(load, 3000)
    return () => clearInterval(intv)
  }, [load])

  const ack = (cameraIdOrAlertId, alertIdOptional) => {
    // Support both (alertId) and old (cameraId, alertId) signatures
    const alertId = alertIdOptional ?? cameraIdOrAlertId
    alertAPI.acknowledge(alertId)
    setAlerts(p => p.map(a => a.id === alertId ? { ...a, acknowledged: true } : a))
  }

  return { alerts, loading, ack, unread: alerts.filter(a => !a.acknowledged).length }
}