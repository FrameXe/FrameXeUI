import { useState, useEffect } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { useCameras } from '../hooks/useCameras.js'
import { useDetections } from '../hooks/useDetections.js'
import { useAllAlerts } from '../hooks/useAlerts.js'
import { UC_MAP, USE_CASES } from '../constants/useCases.js'
import MiniCanvas from '../components/camera/MiniCanvas.jsx'
import { Loading, Empty } from '../components/shared/index.jsx'
import { AlertTriangle, Maximize2 } from 'lucide-react'

export default function UseCaseView() {
  const { useCaseId } = useParams()
  const nav = useNavigate()
  const loc = useLocation()
  const uc = UC_MAP[useCaseId]

  const query = new URLSearchParams(loc.search)
  const qCam = query.get('cam')

  const { cameras, loading: camsLoading } = useCameras()
  const { detections: allDet, loading: detsLoading } = useDetections(useCaseId)

  const [selectedCard, setSelectedCard] = useState(qCam || null)
  const [stFilter, setStFilter] = useState('all')

  useEffect(() => { if (qCam) setSelectedCard(qCam); }, [qCam])

  if (!uc) return <Empty msg="Unknown Intelligence Suite" />

  const ucCams = cameras.filter(c => {
    const isUC = (c.enabled_usecases || [c.camera_id === 'CAM-001' ? 'people_count' : c.useCase]).includes(useCaseId)
    const matchesStatus = stFilter === 'all' || c.status === stFilter
    return isUC && matchesStatus
  })

  // Fetch real global alerts for all cameras in this suite
  const { alerts, ack } = useAllAlerts(ucCams)

  const detections = selectedCard ? allDet.filter(d => d.cameraId === selectedCard) : allDet

  const camCounts = Object.fromEntries(ucCams.map(cam => [
    cam.camera_id || cam.id,
    uc.statFn ? uc.statFn(allDet.filter(d => d.cameraId === (cam.camera_id || cam.id))) : allDet.filter(d => d.cameraId === (cam.camera_id || cam.id)).length,
  ]))

  const activeCount = ucCams.filter(c => c.status === 'active').length

  if (camsLoading) return <Loading msg="Loading cameras…" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header (Exact Match to CameraExplorer) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            {uc.emoji} {uc.label} Explorer
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
            {ucCams.length} camera{ucCams.length !== 1 ? 's' : ''} · {activeCount} active
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={useCaseId} onChange={e => nav(`/use-case/${e.target.value}`)} style={{
            background: '#fff', border: '1px solid var(--border)', color: 'var(--text)',
            padding: '7px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)',
            fontWeight: 500, boxShadow: 'var(--shadow-sm)',
          }}>
            {USE_CASES.map(u => <option key={u.id} value={u.id}>{u.emoji} {u.label}</option>)}
          </select>
          <select value={stFilter} onChange={e => setStFilter(e.target.value)} style={{
            background: '#fff', border: '1px solid var(--border)', color: 'var(--text)',
            padding: '7px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)',
            fontWeight: 500, boxShadow: 'var(--shadow-sm)',
          }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="offline">Offline</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Grid - Identical mapping structure to CameraExplorer.jsx */}
      {ucCams.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center',
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', color: 'var(--text-3)', fontSize: 13,
        }}>No cameras found for {uc.label}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {ucCams.map(cam => {
            const camId = cam.camera_id || cam.id
            const isSelected = selectedCard === camId
            const camDets = allDet.filter(d => d.cameraId === camId)
            const recentDet = camDets[0]
            const camAlerts = alerts.filter(a => a.cameraId === camId && !a.acknowledged && a.usecase === uc.id)

            return (
              <div key={camId} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>

                {/* ACTIVE INCIDENT BADGE */}
                {camAlerts.length > 0 && (
                  <div 
                    onClick={(e) => { e.stopPropagation(); nav('/events'); }}
                    style={{
                      position: 'absolute', top: -10, right: -10, zIndex: 10,
                      background: '#ef4444', color: '#fff', border: '2px solid #fff',
                      borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 900,
                      boxShadow: '0 4px 12px rgba(239,68,68,0.4)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, animation: 'pulseAlert 1.5s infinite alternate'
                    }}
                  >
                    <AlertTriangle size={12} /> {camAlerts.length} ACTION REQUIRED
                  </div>
                )}

                {/* 
                  Native MiniCanvas Component
                  This is exactly what CameraExplorer renders, no extra padding/borders wrapped around it.
                */}
                <MiniCanvas
                  camera={cam}
                  onClick={() => {
                    let targetUc = uc.id
                    if (targetUc === 'vehicle_count' || targetUc === 'vehicle_speed') {
                      targetUc = 'traffic'
                    }
                    if (['traffic', 'people_count', 'crowd_alert', 'intrusion'].includes(targetUc)) {
                      nav(`/camera/${camId}/${targetUc}`)
                    } else {
                      setSelectedCard(isSelected ? null : camId)
                    }
                  }}
                  onDoubleClick={() => nav(`/camera/${camId}`)}
                />

                {/* EXPANDED INFO PANEL (SLIDES DOWN ON SINGLE CLICK) */}
                <div style={{
                  maxHeight: isSelected ? 300 : 0,
                  opacity: isSelected ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: '#fff',
                  borderTop: isSelected ? 'none' : 'none',
                  border: isSelected ? `1px solid ${uc.color}44` : 'none',
                  borderRadius: '0 0 var(--radius) var(--radius)',
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  marginTop: isSelected ? -4 : 0, // pull up slightly to blend with the card above
                  position: 'relative',
                  zIndex: 0
                }}>
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase' }}>Current Det.</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', textTransform: 'capitalize' }}>{recentDet?.label || 'None'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase' }}>Counts ({uc.unit})</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: uc.color, lineHeight: 1 }}>{detsLoading ? '…' : (camCounts[camId] ?? 0)}</div>
                      </div>
                    </div>
                    
                    {/* Unresolved Alerts List Snippet */}
                    {camAlerts.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Unresolved Alerts</div>
                        {camAlerts.slice(0, 2).map(a => (
                          <div key={a.id} 
                            onClick={(e) => { e.stopPropagation(); nav('/events'); }}
                            style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#ef4444', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <span>{a.message}</span>
                            <Maximize2 size={12} />
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button onClick={() => nav(`/camera/${camId}`)}
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Maximize2 size={13} /> CANVAS
                      </button>
                      <button onClick={() => nav('/events')}
                        style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <AlertTriangle size={13} /> ALERTS
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
