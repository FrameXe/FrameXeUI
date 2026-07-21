import { useState, useEffect, useCallback, useRef } from 'react'
import { cameraAPI } from '../services/api.js'
import { useAuthStore } from '../store/index.js'

export function useCameras(tenantId) {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const username  = useAuthStore(s => s.user?.username)  // stable primitive, not object

  const load = useCallback(() => {
    setLoading(true)
    cameraAPI.getAll(tenantId)
      .then(allCams => setCameras(allCams))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [tenantId])

  useEffect(() => {
    load()
  }, [username, tenantId, load])

  return { cameras, loading, error, refresh: load }
}