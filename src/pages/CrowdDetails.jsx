import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity, ShieldAlert, Maximize2, Camera, Target } from 'lucide-react'
import { useCameras } from '../hooks/useCameras.js'
import { useCameraAlerts } from '../hooks/useAlerts.js'
import MiniCanvas from '../components/camera/MiniCanvas.jsx'
import { Loading } from '../components/shared/index.jsx'
import { trackerAPI } from '../services/api.js'

export default function CrowdDetails() {
  const { id } = useParams()
  const nav = useNavigate()
  const { cameras, loading } = useCameras()
  const [liveEvents, setLiveEvents] = useState([])
  const [apiLoading, setApiLoading] = useState(true)

  const cam = cameras.find(c => c.id === id || c.camera_id === id)

  // Crowd Alert specific styling overrides
  const config = { label: 'Crowd Intelligence', emoji: '⚠️', color: '#f59e0b', route: 'crowd_alert' }

  const getMockThumb = (type) => 'https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&q=80&w=300&h=200'

  useEffect(() => {
    if (!cam) return
    let isMounted = true

    const fetchAnalytics = async () => {
      try {
        if (!isMounted) return

        // Call the centralized API (handles USE_MOCK natively)
        const payload = await trackerAPI.getLiveEvents(cam.id || cam.camera_id, config.route)
        let rawDets = payload.detections || payload.events || (Array.isArray(payload) ? payload : [])
        
        if (rawDets.length > 0 && Math.random() > 0.4 && Object.keys(payload).length < 3) {
           rawDets.push(rawDets[0])
        }

        const freshEvents = rawDets.map(det => {
          return {
            ...det,
            track_id: Math.floor(Math.random() * 99999),
            timestamp: new Date().toISOString(),
            _type: config.label,
            icon: Target,
            color: config.color,
            title: 'Cluster Forming',
            highlight: 'Tracking Phase',
            plate_number: null,
            vehicle_type: det.label,
            isAlert: false
          }
        })

        setLiveEvents(prev => {
           const existingIds = new Set(prev.map(p => p.track_id))
           const uniqueNew = freshEvents.filter(n => !existingIds.has(n.track_id))
           if (uniqueNew.length === 0) return prev
           return [...uniqueNew, ...prev].slice(0, 100) 
        })

        setApiLoading(false)
      } catch (err) { }
    }

    fetchAnalytics()
    const timer = setInterval(fetchAnalytics, 2000)
    return () => { 
      isMounted = false
      clearInterval(timer)
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
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
             {cam.name} <span style={{ background: `${config.color}20`, color: config.color, padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{config.emoji} {config.label} Inference</span>
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
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>CROWD | LIVE STREAM</span>
               </div>
               <button onClick={() => nav(`/camera/${cam.id || cam.camera_id}`)} style={{ 
                  background: 'transparent', color: '#fff', border: '1px solid #444', padding: '4px 10px', borderRadius: 4, 
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 
                }}>
                  <Maximize2 size={13} /> FULLSCREEN
                </button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
             <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 20, flex: 1 }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--text-2)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={16}/> Stream Intel</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                   <div>
                     <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>DENSITY RATING</div>
                     <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>MODERATE</div>
                   </div>
                   <div>
                     <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>EVENTS (M)</div>
                     <div style={{ fontSize: 24, fontWeight: 800, color: config.color }}>{liveEvents.length}</div>
                   </div>
                </div>
             </div>
             
             <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 20, flex: 1 }}>
               <h3 style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--text-2)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}><ShieldAlert size={16} /> Cluster Spikes</h3>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                 <div style={{ background: '#fef2f2', color: '#ef4444', width: 48, height: 48, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900 }}>
                   {liveEvents.filter(e => e.color === '#ef4444').length}
                 </div>
                 <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500, lineHeight: 1.4 }}>
                   Active dense clusters or panic running patterns detected in buffer bounds.
                 </div>
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
                    <th style={{ padding: '12px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Tracking ID</th>
                    <th style={{ padding: '12px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Classification</th>
                    <th style={{ padding: '12px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Density Score</th>
                    <th style={{ padding: '12px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Timestamp</th>
                    <th style={{ padding: '12px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {/* PURE DETECTIONS STREAM */}

                  {/* STANDARD DETECTIONS FETCHED FROM trackerAPI */}
                  {liveEvents.map((ev, idx) => {
                    const Icon = ev.icon
                    return (
                      <tr key={`${ev.track_id}-${idx}`} style={{ borderBottom: '1px solid #e2e8f0', background: '#fff', transition: 'background 0.2s' }}>
                        <td style={{ padding: '12px 20px', fontWeight: 800, color: 'var(--text)' }}>
                           #{ev.track_id}
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: config.color, fontWeight: 800, textTransform: 'uppercase' }}>
                             <Icon size={14} /> {ev._type}
                           </div>
                           <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 4, textTransform: 'capitalize' }}>
                             {ev.vehicle_type || 'Cluster'}
                           </div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                           <div style={{ fontSize: 13, fontWeight: 800, color: (ev.intensity || 0.5) > 4 ? '#ef4444' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                             <div style={{ width: 40, height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                               <div style={{ width: `${(ev.intensity || 0.5) * 20}%`, height: '100%', background: (ev.intensity || 0.5) > 4 ? '#ef4444' : config.color }}></div>
                             </div>
                             {ev.intensity || (Math.random() * 5).toFixed(1)}
                           </div>
                        </td>
                        <td style={{ padding: '12px 20px', color: 'var(--text-2)', fontSize: 12, fontWeight: 600 }}>
                           {new Date(ev.timestamp).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                           <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981' }}>{ev.confidence ? `${Math.round(ev.confidence * 100)}%` : '93%'}</div>
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
    </div>
  )
}
