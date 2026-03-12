import { useParams, useNavigate } from 'react-router-dom'
import { useCameras }   from '../hooks/useCameras.js'
import CanvasEditor     from '../components/camera/CanvasEditor.jsx'
import { Loading }      from '../components/shared/index.jsx'

export default function CameraDetail() {
  const { id } = useParams()
  const nav    = useNavigate()
  const { cameras, loading } = useCameras()

  if (loading) return <Loading msg="LOADING CAMERA…"/>

  const camera = cameras.find(c => c.id === id)
  if (!camera)  return <Loading msg="CAMERA NOT FOUND"/>

  // CanvasEditor is fixed-position, covers entire screen
  return <CanvasEditor camera={camera} onClose={() => nav(-1)} />
}
