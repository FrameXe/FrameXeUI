import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useCameras }   from '../hooks/useCameras.js'
import CanvasEditor     from '../components/camera/CanvasEditor.jsx'
import { Loading }      from '../components/shared/index.jsx'
import { useAuthStore } from '../store/index.js'

export default function CameraDetail() {
  const { id } = useParams()
  const nav    = useNavigate()
  const { cameras, loading } = useCameras()
  const hasCameraAccess = useAuthStore(s => s.hasCameraAccess)

  useEffect(() => {
    if (!loading && !hasCameraAccess(id)) {
      nav('/access-denied', { replace: true })
    }
  }, [id, loading, hasCameraAccess, nav])

  if (loading) return <Loading msg="LOADING CAMERA…"/>
  if (!hasCameraAccess(id)) return null

  const camera = cameras.find(c => c.id === id)
  if (!camera)  return <Loading msg="CAMERA NOT FOUND"/>

  // CanvasEditor is fixed-position, covers entire screen
  return <CanvasEditor camera={camera} onClose={() => nav(-1)} />
}
