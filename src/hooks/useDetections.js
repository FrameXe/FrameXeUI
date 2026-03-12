import { useEffect } from 'react'
import { useDetStore } from '../store/index.js'
import { detectionAPI } from '../services/api.js'

export function useDetections(type) {
  const store = useDetStore()
  useEffect(() => {
    if (!type) return
    store.setLoading(type, true)
    detectionAPI.getByType(type)
      .then(d => store.set(type, d))
      .finally(() => store.setLoading(type, false))
  }, [type])
  return { detections: store.get(type), loading: store.isLoading(type) }
}
