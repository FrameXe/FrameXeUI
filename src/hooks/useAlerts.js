import { useState, useEffect, useCallback } from 'react'
import { alertAPI } from '../services/api.js'
import { useAuthStore } from '../store/index.js'

// GET /api/alerts/live?camera_id=&usecase= — per camera per usecase
export function useCameraAlerts(cameraId, usecase) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const hasCameraAccess = useAuthStore(s => s.hasCameraAccess)

  const load = useCallback(() => {
    if (!cameraId || !hasCameraAccess(cameraId)) {
      setAlerts([])
      return
    }
    setLoading(true)
    alertAPI.getForCamera(cameraId, usecase)
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [cameraId, usecase, hasCameraAccess])

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
    const alertId = alertIdOptional ?? cameraIdOrAlertId
    alertAPI.acknowledge(alertId)
    setAlerts(p => p.map(a => a.id === alertId ? { ...a, acknowledged: true } : a))
  }

  // Filter alerts by the cameras this user is allowed to see
  const cameraIds = cameras.map(c => c.id || c.camera_id)
  const filteredAlerts = alerts.filter(a => cameraIds.includes(a.cameraId))

  return { 
    alerts: filteredAlerts, 
    loading, 
    ack, 
    unread: filteredAlerts.filter(a => !a.acknowledged).length 
  }
}