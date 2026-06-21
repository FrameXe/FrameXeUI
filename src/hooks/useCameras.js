import { useState, useEffect } from 'react'
import { cameraAPI } from '../services/api.js'
import { useAuthStore } from '../store/index.js'

// GET /api/cameras → sab kuch ek call mein
// hls_url, location, status, enabled_usecases — sab inline
// Koi separate /stream call nahi
export function useCameras() {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const user = useAuthStore(s => s.user)

  const load = () => {
    setLoading(true)
    cameraAPI.getAll()
      .then(allCams => {
        // Real mode: show all cameras from backend
        // allowedCameras filter only applies in mock mode with known IDs
        setCameras(allCams)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username])  // only re-run when user changes, not on every render

  return { cameras, loading, error, refresh: load }
}