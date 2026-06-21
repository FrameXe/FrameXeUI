import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Camera, Activity, Clock, Shield, AlertTriangle, AlertOctagon,
  Users, Car, Maximize2, Download, ShieldAlert, Gauge,
  ChevronRight, Calendar, Info, MapPin
} from 'lucide-react'
import { useCameras } from '../hooks/useCameras.js'
import { useCameraAlerts } from '../hooks/useAlerts.js'
import MiniCanvas from '../components/camera/MiniCanvas.jsx'
import { Loading } from '../components/shared/index.jsx'

import { trafficAPI } from '../services/api.js'

export default function TrafficDetails() {
  const { id } = useParams()
  const useCaseFromUrl = useParams().usecase || 'traffic'
  const usecase = useCaseFromUrl // Alias for compatibility with previous edits
  const nav = useNavigate()
  const { cameras, loading } = useCameras()
  const [liveEvents, setLiveEvents] = useState([])
  const [apiLoading, setApiLoading] = useState(true) // Traffic specific styling overrides
  const config = { label: 'Traffic & Vehicles', emoji: '🚗', color: '#10b981', route: 'traffic' }
  const [metrics, setMetrics] = useState({ 
    congestion: null, 
    parking: null, 
    speeding: null, 
    counts: null 
  })
  
  const cam = cameras.find(c => c.id === id || c.camera_id === id)

  useEffect(() => {
    if (!cam) return
    let isMounted = true

    const fetchAll = async () => {
      try {
        const camId = cam.id || cam.camera_id

        // Single unified call: GET /api/analytics/traffic/{camera_id}
        const [trafficSnap, peopleSnap] = await Promise.allSettled([
          trafficAPI.getTrafficSnapshot(camId),
          trafficAPI.getPeopleCount(camId),
        ])

        if (!isMounted) return

        const traffic = trafficSnap.status === 'fulfilled' ? trafficSnap.value : null
        const people  = peopleSnap.status  === 'fulfilled' ? peopleSnap.value  : null

        setMetrics({
          congestion: traffic ? { level: traffic.congestion_level, count: traffic.vehicle_count, speed: traffic.average_speed } : null,
          parking: null,
          speeding: traffic?.statistics || null,
          counts: traffic?.counts || null,
        })

        const freshEvents = []

        // Synthetic summary events from traffic snapshot
        if (traffic) {
          if (traffic.congestion_level) {
            freshEvents.push({
              track_id: 'CONGESTION', _type: 'Congestion', icon: Activity,
              color: traffic.congestion_level === 'high' ? '#ef4444' : '#3b82f6',
              title: `Level: ${traffic.congestion_level.toUpperCase()}`,
              highlight: `${traffic.vehicle_count ?? 0} Vehicles`,
              timestamp: traffic.timestamp, is_synthetic: true,
            })
          }
          if (traffic.counts) {
            freshEvents.push({
              track_id: 'COUNT', _type: 'Flow Count', icon: Users,
              color: '#8b5cf6', title: 'Total IN/OUT',
              highlight: `IN: ${traffic.counts.IN ?? 0} / OUT: ${traffic.counts.OUT ?? 0}`,
              timestamp: traffic.timestamp, is_synthetic: true,
            })
          }
          // Per-event items from the events array
          ;(traffic.events || []).forEach(e => {
            if (e._service === 'wrong_way') {
              freshEvents.push({
                track_id: `WW-${e.track_id}`, _type: 'Wrong Way', icon: AlertOctagon,
                color: '#ef4444', title: 'Violation', highlight: `${e.vehicle_type || 'Vehicle'} detected`,
                timestamp: traffic.timestamp,
              })
            } else if (e._service === 'speed_detection') {
              freshEvents.push({
                track_id: `SP-${e.track_id}`, _type: 'Speed Detection', icon: Gauge,
                color: e.is_violation ? '#ef4444' : '#10b981',
                title: e.is_violation ? 'Violation' : 'Audit',
                highlight: `${e.speed_kmh} km/h`,
                timestamp: traffic.timestamp,
              })
            }
          })
        }

        // People events
        if (people) {
          ;(people.detections || []).forEach(d => {
            freshEvents.push({
              track_id: d.tracking_id || d.id, _type: 'People Count', icon: Users,
              color: '#10b981',
              title: d.direction ? `Direction: ${d.direction}` : 'Detected',
              highlight: d.crossed_line ? 'Crossed' : 'In Frame',
              timestamp: people.timestamp, confidence: d.confidence,
            })
          })
        }

        setLiveEvents(prev => {
          const nonSynthetic = freshEvents.filter(e => !e.is_synthetic)
          const synthetic    = freshEvents.filter(e => e.is_synthetic)
          const existingIds  = new Set(prev.map(p => p.track_id))
          const uniqueNew    = nonSynthetic.filter(n => !existingIds.has(n.track_id))
          const updated      = [...synthetic, ...uniqueNew, ...prev.filter(p => !synthetic.some(s => s.track_id === p.track_id))]
          return updated.slice(0, 8)
        })

        setApiLoading(false)
      } catch (err) {
        console.warn('[TrafficDetails] fetch error:', err)
      }
    }

    fetchAll()
    const timer = setInterval(fetchAll, 2500)
    return () => { isMounted = false; clearInterval(timer) }
  }, [cam])

  if ((loading && cameras.length === 0) || (apiLoading && liveEvents.length === 0)) return <Loading msg="Synchronizing Live Telemetry Feed…" />
  if (!cam) return <div style={{ padding: 40, textAlign: 'center' }}>Camera off-grid.</div>

  const getMockThumb = (type) => {
    if (type === 'truck') return 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=300&h=200'
    if (type === 'motorcycle') return 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=300&h=200'
    return 'https://images.unsplash.com/photo-1549317661-bd32c8ce0be2?auto=format&fit=crop&q=80&w=300&h=200'
  }

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
             {cam.name} 
             <span style={{ background: '#10b98120', color: '#10b981', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{usecase.replace(/_/g, ' ')} Module</span>
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
             {cam.location} • Stream ID: {cam.id || cam.camera_id}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Top Section */}
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ width: 500, flexShrink: 0, background: '#000', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <div style={{ width: '100%', height: 280, position: 'relative' }}>
               <MiniCanvas camera={cam} onClick={() => {}} onDoubleClick={() => nav(`/camera/${cam.id || cam.camera_id}`)} />
            </div>
            <div style={{ background: '#111', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #333' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>LIVE EDGE STREAM</span>
               </div>
               <button onClick={() => nav(`/camera/${cam.id || cam.camera_id}`)} style={{ background: 'transparent', color: '#fff', border: '1px solid #444', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Maximize2 size={13} /> FULLSCREEN
               </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 18, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
             <h3 style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={15}/> Live Fleet Telemetry</h3>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {metrics.counts && (
                  <>
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase' }}>TOTAL VEHICLE FLOW</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>{metrics.counts.IN + metrics.counts.OUT}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: 10, borderRadius: 8, border: '1px solid #dcfce7' }}>
                      <div style={{ fontSize: 9, color: '#10b981', fontWeight: 800 }}>INFLOW</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>{metrics.counts.IN}</div>
                    </div>
                    <div style={{ background: '#fef2f2', padding: 10, borderRadius: 8, border: '1px solid #fee2e2' }}>
                      <div style={{ fontSize: 9, color: '#ef4444', fontWeight: 800 }}>OUTFLOW</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444' }}>{metrics.counts.OUT}</div>
                    </div>
                  </>
                )}
                {metrics.congestion && (
                  <div style={{ background: metrics.congestion.level === 'high' ? '#fee2e2' : '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: 9, color: metrics.congestion.level === 'high' ? '#ef4444' : 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase' }}>NETWORK CONGESTION</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: metrics.congestion.level === 'high' ? '#ef4444' : 'var(--text)', marginTop: 4 }}>{metrics.congestion.level.toUpperCase()}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{metrics.congestion.count} Units In-Frame</div>
                  </div>
                )}
                {metrics.speeding && (
                  <div style={{ background: '#f0f9ff', padding: 12, borderRadius: 8, border: '1px solid #e0f2fe', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: 9, color: '#0369a1', fontWeight: 800, textTransform: 'uppercase' }}>VELOCITY METRICS</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0369a1', marginTop: 4 }}>{metrics.speeding.average_speed} <span style={{ fontSize: 11 }}>KM/H AVG</span></div>
                    <div style={{ fontSize: 10, color: '#0369a190', fontWeight: 600 }}>Peak Recorded: {metrics.speeding.highest_speed}</div>
                  </div>
                )}
             </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 18, flex: 1 }}>
             <h3 style={{ margin: '0 0 14px 0', fontSize: 13, color: 'var(--text-2)', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><ShieldAlert size={15} /> System Integrity</h3>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
               <div style={{ background: '#1e293b', color: '#fff', width: 42, height: 42, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900 }}>AI</div>
               <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, lineHeight: 1.3 }}>
                 <span style={{ color: '#ef4444', fontWeight: 800 }}>{liveEvents.filter(e => e.color === '#ef4444').length} priority incidents</span> detected recently.
               </div>
             </div>
          </div>
        </div>

        {/* Detection Log */}
        <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
           <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                 <Camera size={18} color={config.color} /> Live Detection Stream
              </h2>
           </div>
           <div style={{ overflowX: 'auto', maxHeight: 400 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <tr>
                    <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Reference</th>
                    <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Event</th>
                    <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Insight</th>
                    <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {liveEvents.map((ev, idx) => {
                    const Icon = ev.icon
                    const isViolation = ev.color === '#ef4444'
                    return (
                      <tr key={`${ev.track_id}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 20px' }}>
                           <div style={{ fontWeight: 800, fontSize: 14 }}>TRK-{ev.track_id}</div>
                           {ev.meta?.plate && <div style={{ background: '#1e293b', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 900, marginTop: 6, display: 'inline-flex' }}>{ev.meta.plate}</div>}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: ev.color || config.color, fontWeight: 800, textTransform: 'uppercase' }}>
                             <Icon size={16} /> {ev._type}
                           </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                           <div style={{ fontSize: 13, fontWeight: 900, color: ev.color || 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                             {ev.highlight}
                           </div>
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--text-3)', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
                           {new Date(ev.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  )
}
