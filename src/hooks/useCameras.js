import { useEffect } from 'react'
import { useCameraStore } from '../store/index.js'
import { cameraAPI } from '../services/api.js'

export function useCameras() {
  const store = useCameraStore()
  useEffect(() => {
    if (store.cameras.length) return
    store.setLoading(true)
    cameraAPI.getAll()
      .then(store.set)
      .catch(e => store.setError(e.message))
      .finally(() => store.setLoading(false))
  }, [])
  return { cameras: store.cameras, loading: store.loading, error: store.error }
}
