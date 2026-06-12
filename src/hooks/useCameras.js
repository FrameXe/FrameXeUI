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
        if (user && user.allowedCameras) {
          setCameras(allCams.filter(cam => user.allowedCameras.includes(cam.id)))
        } else {
          setCameras([])
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (user) {
      load()
    } else {
      setCameras([])
      setLoading(false)
    }
  }, [user])

  return { cameras, loading, error, refresh: load }
}