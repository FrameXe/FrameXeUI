import { useState, useEffect, useCallback, useRef } from 'react'
import { cameraAPI } from '../services/api.js'
import { useAuthStore } from '../store/index.js'

export function useCameras() {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const username  = useAuthStore(s => s.user?.username)  // stable primitive, not object
  const hasFetched = useRef(false)

  const load = useCallback(() => {
    setLoading(true)
    cameraAPI.getAll()
      .then(allCams => setCameras(allCams))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])  // no deps — function never recreated

  useEffect(() => {
    // Run once on mount, and again only if user actually changes
    if (!hasFetched.current || username) {
      hasFetched.current = true
      load()
    }
  }, [username, load])

  return { cameras, loading, error, refresh: load }
}