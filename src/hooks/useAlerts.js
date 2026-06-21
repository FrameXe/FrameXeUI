import { useState, useEffect, useCallback, useRef } from 'react'
import { alertAPI } from '../services/api.js'
import { useAuthStore } from '../store/index.js'

// GET /api/alerts/live?camera_id=&usecase= — per camera per usecase
export function useCameraAlerts(cameraId, usecase) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const allowedCameras = useAuthStore(s => s.user?.allowedCameras)
  const isFirstLoad = useRef(true)

  useEffect(() => {
    isFirstLoad.current = true
  }, [cameraId, usecase])

  const load = useCallback(() => {
    if (!cameraId) { setAlerts([]); return }
    if (isFirstLoad.current) setLoading(true)
    alertAPI.getForCamera(cameraId, usecase)
      .then(d => { setAlerts(d); isFirstLoad.current = false })
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [cameraId, usecase])  // removed hasCameraAccess — it changes every render

  useEffect(() => {
    load()
    const intv = setInterval(load, 5000)  // 5s instead of 3s to reduce load
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
  const isFirstLoad = useRef(true)

  const load = useCallback(() => {
    if (isFirstLoad.current) {
      setLoading(true)
    }
    alertAPI.getLive({ limit: 200 })
      .then(d => {
        setAlerts(d)
        isFirstLoad.current = false
      })
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const intv = setInterval(load, 10000)  // 10s polling
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
    loading: loading, 
    ack, 
    unread: filteredAlerts.filter(a => !a.acknowledged).length 
  }
}