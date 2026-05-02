import { useState, useEffect } from 'react'
import { analyticsAPI, systemAPI, reportAPI } from '../services/api.js'

// GET /api/system — dashboard big-number cards
export function useSummary(params = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    systemAPI.getOverview().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, []) // eslint-disable-line
  return { summary: data, loading }
}

// GET /api/analytics/traffic/{camera_id}
export function useTrafficAnalytics(cameraId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!cameraId) return
    setLoading(true)
    analyticsAPI.getTraffic(cameraId).then(setData).catch(() => {}).finally(() => setLoading(false))
    const intv = setInterval(() => {
      analyticsAPI.getTraffic(cameraId).then(setData).catch(() => {})
    }, 2000)
    return () => clearInterval(intv)
  }, [cameraId])
  return { traffic: data, loading }
}

// GET /api/analytics/people/{camera_id}
export function usePeopleAnalytics(cameraId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!cameraId) return
    setLoading(true)
    analyticsAPI.getPeople(cameraId).then(setData).catch(() => {}).finally(() => setLoading(false))
    const intv = setInterval(() => {
      analyticsAPI.getPeople(cameraId).then(setData).catch(() => {})
    }, 2000)
    return () => clearInterval(intv)
  }, [cameraId])
  return { people: data, loading }
}

// GET /api/alerts/live (used by events feed)
export function useEvents(params = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const key = JSON.stringify(params)
  useEffect(() => {
    setLoading(true)
    analyticsAPI.getEvents(params).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [key]) // eslint-disable-line
  return { events: data, loading }
}

// GET /api/reports
export function useReport(params = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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