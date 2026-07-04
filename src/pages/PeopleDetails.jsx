import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity, ShieldAlert, Maximize2, Camera, Users, MoveDown, MoveUp } from 'lucide-react'
import { useCameras } from '../hooks/useCameras.js'
import { useCameraAlerts } from '../hooks/useAlerts.js'
import MiniCanvas from '../components/camera/MiniCanvas.jsx'
import { Loading } from '../components/shared/index.jsx'
import { trafficAPI } from '../services/api.js'
import { sseManager } from '../lib/sseManager.js'

export default function PeopleDetails() {
  const { id } = useParams()
  const nav = useNavigate()
  const { cameras, loading } = useCameras()
  const [liveEvents, setLiveEvents] = useState([])
  const [apiLoading, setApiLoading] = useState(true)
  const [metrics, setMetrics] = useState({ total: 0, in: 0, out: 0 })

  const cam = cameras.find(c => c.id === id || c.camera_id === id)

  // People count specific styling overrides
  const config = { label: 'People Tracking', emoji: '🧑‍🤝‍🧑', color: '#3b82f6', route: 'people_count' }

  const getMockThumb = (type) => 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300&h=200'

  useEffect(() => {
    if (!cam) return

    const BASE_URL = import.meta.env.VITE_API_URL || ''
    const url = `${BASE_URL}/api/sse/analytics/${cam.id || cam.camera_id}`

    // Low-frequency polling for aggregate metrics only
    const fetchMetrics = async () => {
      try {
        const payload = await trafficAPI.getPeopleCount(cam.id || cam.camera_id)
        if (payload?.metrics) {
           setMetrics({
             total: payload.metrics.total,
             in: payload.metrics.count_in,
             out: payload.metrics.count_out
           })
        }
      } catch (e) {}
    }
    fetchMetrics()
    const metricsTimer = setInterval(fetchMetrics, 5000)

    // Real-time SSE subscription for detection table
    const unsub = sseManager.subscribe(url, 'analytics', (payload) => {
      const uc     = payload?.usecase
      if (uc !== config.route) return // config.route is 'people_count'

      const tracks = payload?.data?.tracking_data?.tracks ?? []
      const peopleDetail = payload?.data?.people_detail ?? []
      const countedIds = new Set(peopleDetail.filter(p => p.counted).map(p => p.track_id))

      const freshEvents = tracks.map(track => {
        let conf = track.confidence
        if (conf === undefined || conf === null) conf = 0.95
        const confidenceVal = conf > 1 ? conf / 100 : conf

        const isCounted = countedIds.has(track.track_id)

        return {
          id: `${uc}-${track.track_id}`,
          track_id: track.track_id,
          timestamp: payload.timestamp || new Date().toISOString(),
          _type: 'Boundary Cross',
          icon: Users,
          color: config.color,
          title: isCounted ? 'Line Crossed' : 'In Frame',
          highlight: isCounted ? 'LINE CROSSED' : 'ACTIVE TRACK',
          confidence: confidenceVal,
          raw_direction: isCounted ? 'in' : null,
          crossed_line: isCounted
        }
      })

      setLiveEvents(prev => {
        const existingIds = new Set(prev.map(p => p.track_id))
        const uniqueNew = freshEvents.filter(n => !existingIds.has(n.track_id))
        if (uniqueNew.length === 0) return prev
        return [...uniqueNew, ...prev].slice(0, 100)
      })

      setApiLoading(false)
    })

    const timeout = setTimeout(() => {
      setApiLoading(false)
    }, 3000)

    return () => {
      unsub()
      clearInterval(metricsTimer)
      clearTimeout(timeout)
    }
  }, [cam])

  if ((loading && cameras.length === 0) || (apiLoading && liveEvents.length === 0)) return <Loading msg={`Synchronizing ${config.label} Telemetry Feed…`} />
  if (!cam) return <div style={{ padding: 40, textAlign: 'center' }}>Camera off-grid.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => nav(-1)} style={{
          background: '#fff', border: '1px solid var(--border)', padding: 8, borderRadius: '50%',
          cursor: 'pointer', display: 'flex', color: 'var(--text)', boxShadow: 'var(--shadow-sm)'
        }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
             {cam.name} <span style={{ background: `${config.color}20`, color: config.color, padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{config.label} Module</span>
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
             {cam.location} • Stream ID: {cam.id || cam.camera_id}
          </p>
        </div>
      </div>

      {/* HEADER IS HERE, BANNER REMOVED */}

      {/* SAFETY CENTER STYLE LAYOUT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Main Video Player */}
          <div style={{ width: 500, flexShrink: 0, background: '#000', borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
            <div style={{ width: '100%', height: 280, position: 'relative' }}>
               <MiniCanvas camera={cam} onClick={() => {}} onDoubleClick={() => nav(`/camera/${cam.id || cam.camera_id}`)} />
            </div>
            <div style={{ background: '#111', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #333' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, boxShadow: `0 0 8px ${config.color}` }} />
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>PEOPLE | LIVE STREAM</span>
               </div>
               <button onClick={() => nav(`/camera/${cam.id || cam.camera_id}`)} style={{ 
                  background: 'transparent', color: '#fff', border: '1px solid #444', padding: '4px 10px', borderRadius: 4, 
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 
                }}>
                  <Maximize2 size={13} /> FULLSCREEN
                </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL FOOTFALL</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>{metrics.total}</div>
            </div>
            <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #dcfce7' }}>
              <div style={{ fontSize: 9, color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MoveDown size={10} /> LIVE INFLOW
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981', marginTop: 4 }}>{metrics.in}</div>
            </div>
            <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, border: '1px solid #fee2e2' }}>
              <div style={{ fontSize: 9, color: '#ef4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MoveUp size={10} /> LIVE OUTFLOW
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444', marginTop: 4 }}>{metrics.out}</div>
            </div>
          </div>
        </div>
              
        <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 18, flex: 1 }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: 13, color: 'var(--text-2)', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><ShieldAlert size={15} /> Operational Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#f0f9ff', color: '#0369a1', width: 42, height: 42, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900 }}>
              SYS
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, lineHeight: 1.3 }}>
              AI Inference running at <span style={{ color: '#0369a1' }}>nominal load</span>. Tracking accuracy optimized for high-density movement.
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
         <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', letterSpacing: '-0.01em' }}>
               <Camera size={18} color={config.color} /> Live Detection Stream
            </h2>
         </div>

         <div style={{ overflowX: 'auto', maxHeight: 400 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <tr>
                  <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Object UUID</th>
                  <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Movement Classification</th>
                  <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inference Action</th>
                  <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Detection Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {/* PURE DETECTIONS STREAM */}
                {liveEvents.map((ev, idx) => {
                  const Icon = ev.icon
                  return (
                    <tr key={`${ev.track_id}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--text)', fontSize: 13 }}>
                         {ev.track_id}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: config.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                           <Icon size={16} /> {ev._type}
                         </div>
                         <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 4 }}>
                           Human Target
                         </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                         <div style={{ fontSize: 13, fontWeight: 900, color: ev.crossed_line ? '#10b981' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                           <span style={{ 
                             background: ev.raw_direction === 'in' ? '#10b981' : (ev.raw_direction === 'out' ? '#ef4444' : '#64748b'), 
                             width: 8, height: 8, borderRadius: '50%'
                           }}></span>
                           {ev.highlight}
                           {ev.raw_direction && (
                             <span style={{ 
                               background: '#f1f5f9', border: '1px solid #e2e8f0',
                               color: 'var(--text-2)',
                               padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800
                             }}>
                               {ev.raw_direction.toUpperCase()} FLOW
                             </span>
                           )}
                         </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--text-3)', fontSize: 13, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                         {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  )
                })}
                {liveEvents.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontWeight: 500 }}>
                       No telemetry data available. AI models are scanning.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
         </div>
      </div>
    </div>
  )
}
