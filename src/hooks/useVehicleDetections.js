import { useState, useEffect, useCallback } from 'react'
import { vehicleDetectionAPI } from '../services/api.js'

export function useVehicleDetections(filters = {}) {
  const [detections, setDetections] = useState([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ total: 0, entering: 0, exiting: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchDetections = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const apiParams = {
        camera_id: filters.cameraId || undefined,
        plate: filters.plate || undefined,
        vehicle_type: (filters.vehicleType && filters.vehicleType !== 'All') ? filters.vehicleType : undefined,
        direction: (filters.direction && filters.direction !== 'both') ? filters.direction : undefined,
        start_time: filters.startTime ? new Date(filters.startTime).toISOString() : undefined,
        end_time: filters.endTime ? new Date(filters.endTime).toISOString() : undefined,
        page: filters.page || 1,
        page_size: filters.pageSize || 20,
      }

      // Fetch list and stats in parallel
      const [listRes, statsRes] = await Promise.all([
        vehicleDetectionAPI.list(apiParams),
        vehicleDetectionAPI.stats({
          camera_id: apiParams.camera_id,
          start_time: apiParams.start_time,
          end_time: apiParams.end_time,
        })
      ])

      setDetections(listRes.detections || [])
      setTotal(listRes.total || 0)
      setStats(statsRes || { total: 0, entering: 0, exiting: 0 })
    } catch (err) {
      console.error('Failed to fetch vehicle detections:', err)
      setError(err.message || 'Failed to fetch detections')
    } finally {
      setLoading(false)
    }
  }, [
    filters.cameraId,
    filters.plate,
    filters.vehicleType,
    filters.direction,
    filters.startTime,
    filters.endTime,
    filters.page,
    filters.pageSize,
  ])

  useEffect(() => {
    fetchDetections()
  }, [fetchDetections])

  return {
    detections,
    total,
    stats,
    loading,
    error,
    refetch: fetchDetections,
  }
}
