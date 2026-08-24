// NEW HOOK — manages state for HistoricalAnalytics section only
// NO realtime/SSE/socket — DB fetch only
// Custom range max = 45 days, validate before API call
// Debounce filter changes by 400ms
// Missing values → '--', never '0'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { analyticsAPI, cameraAPI } from '../services/api.js'

export const METRIC_OPTIONS = [
  { id: 'vehicle_count',  label: 'Vehicle Count',          color: '#0ea5e9' },
  { id: 'people_count',   label: 'People Count',           color: '#4f6df5' },
  { id: 'people_flow',    label: 'People Flow (IN/OUT)',   color: '#10b981' },
  { id: 'vehicle_types',  label: 'Vehicle Type Breakdown', color: '#8b5cf6' },
  { id: 'congestion',     label: 'Congestion Level',       color: '#f59e0b' },
]

export const PAGE_SIZE = 20

export function useHistoricalAnalytics() {
  const [cameras, setCameras] = useState([])
  const [camerasLoading, setCamerasLoading] = useState(true)

  // Filters state
  const [selectedMetrics, setSelectedMetrics] = useState([
    'vehicle_count', 'people_count', 'people_flow', 'vehicle_types', 'congestion'
  ])
  const [selectedPeriod, setSelectedPeriod] = useState('daily') // 'daily' | 'weekly' | 'monthly' | 'custom'
  const [selectedCameras, setSelectedCameras] = useState([])     // [] means "All Cameras"
  const [viewMode, setViewMode]               = useState('chart') // 'chart' | 'table'

  // Custom date range state (default to past 14 days)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return d.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10)
  })

  // Table state
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig]   = useState({ key: null, direction: 'asc' })

  // Fetched data state
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  // Fetch camera list on mount
  useEffect(() => {
    let active = true
    cameraAPI.getCameraList()
      .then(list => {
        if (active) {
          setCameras(list || [])
          setCamerasLoading(false)
        }
      })
      .catch(() => {
        if (active) setCamerasLoading(false)
      })
    return () => { active = false }
  }, [])

  // Minimum selection rule for metrics (at least 1 metric must remain selected)
  const toggleMetric = useCallback((metricId) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricId)) {
        if (prev.length <= 1) return prev // block deselecting the last metric
        return prev.filter(m => m !== metricId)
      }
      return [...prev, metricId]
    })
    setCurrentPage(1)
  }, [])

  // Camera multi-select toggle handlers
  const toggleCamera = useCallback((camId) => {
    setSelectedCameras(prev => {
      if (prev.includes(camId)) {
        return prev.filter(id => id !== camId)
      }
      return [...prev, camId]
    })
    setCurrentPage(1)
  }, [])

  const selectAllCameras = useCallback(() => {
    setSelectedCameras([])
    setCurrentPage(1)
  }, [])

  // Period change handler
  const changePeriod = useCallback((period) => {
    setSelectedPeriod(period)
    setCurrentPage(1)
  }, [])

  // Date range validation rules
  const dateValidationError = useMemo(() => {
    if (selectedPeriod !== 'custom') return null
    if (!startDate || !endDate) return null

    const start = new Date(startDate)
    const end   = new Date(endDate)

    if (start > end) {
      return 'Start date must be before end date'
    }

    const diffTime = end.getTime() - start.getTime()
    const diffDays = diffTime / (1000 * 3600 * 24)

    if (diffDays > 45) {
      return 'Maximum range is 45 days'
    }

    return null
  }, [selectedPeriod, startDate, endDate])

  // Debounced data fetch (400ms)
  useEffect(() => {
    if (dateValidationError) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const timer = setTimeout(async () => {
      try {
        const params = {
          period: selectedPeriod,
          metric: selectedMetrics,
          camera_ids: selectedCameras.length > 0 ? selectedCameras : undefined,
          ...(selectedPeriod === 'custom' ? { start_date: startDate, end_date: endDate } : {}),
        }

        const res = await analyticsAPI.getHistoricalAnalytics(params)
        const records = Array.isArray(res) ? res : (res?.data || [])
        setData(records)
      } catch (err) {
        console.warn('[useHistoricalAnalytics] Fetch failed:', err)
        // Set empty array on failure instead of breaking UI
        setData([])
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [selectedMetrics, selectedPeriod, selectedCameras, startDate, endDate, dateValidationError])

  // Sorting helper for table view
  const handleSort = useCallback((key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }, [])

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data
    const { key, direction } = sortConfig
    return [...data].sort((a, b) => {
      let aVal = a[key]
      let bVal = b[key]

      if (aVal == null) return 1
      if (bVal == null) return -1

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      return direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [data, sortConfig])

  // Paginated data for table view (PAGE_SIZE = 20)
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return sortedData.slice(startIndex, startIndex + PAGE_SIZE)
  }, [sortedData, currentPage])

  const totalPages = useMemo(() => {
    return Math.ceil(sortedData.length / PAGE_SIZE) || 1
  }, [sortedData])

  return {
    cameras,
    camerasLoading,
    selectedMetrics,
    toggleMetric,
    selectedPeriod,
    changePeriod,
    selectedCameras,
    toggleCamera,
    selectAllCameras,
    viewMode,
    setViewMode,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dateValidationError,
    data,
    sortedData,
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
    sortConfig,
    handleSort,
    loading,
    error,
  }
}
