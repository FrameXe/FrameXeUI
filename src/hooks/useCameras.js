import { useState, useEffect } from 'react'
import { cameraAPI } from '../services/api.js'

// GET /api/cameras → sab kuch ek call mein
// hls_url, location, status, enabled_usecases — sab inline
// Koi separate /stream call nahi
export function useCameras() {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    cameraAPI.getAll()
      .then(setCameras)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return { cameras, loading, error, refresh: load }
}