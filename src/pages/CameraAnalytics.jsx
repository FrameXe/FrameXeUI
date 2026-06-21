import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Camera, Activity, Clock, Shield, AlertTriangle, AlertOctagon,
  Users, Car, Maximize2, ShieldAlert, Gauge, UserPlus, MapPin, 
  ChevronRight, RefreshCcw, Info
} from 'lucide-react'
import { useCameras } from '../hooks/useCameras.js'
import MiniCanvas from '../components/camera/MiniCanvas.jsx'
import { Loading } from '../components/shared/index.jsx'
import { trafficAPI } from '../services/api.js'
import { useAuthStore } from '../store/index.js'

export default function CameraAnalytics() {
  const { id } = useParams()
  const nav = useNavigate()
  const { cameras, loading } = useCameras()
  const hasCameraAccess = useAuthStore(s => s.hasCameraAccess)

  const [liveEvents, setLiveEvents] = useState([])
  const [activeFilters, setActiveFilters] = useState([])
  const [apiLoading, setApiLoading] = useState(true)
  const [metrics, setMetrics] = useState({ 
    congestion: null, 
    parking: null, 
    speeding: null, 
    traffic_flow: null,
    people_flow: null 
  })
  
  const cam = cameras.find(c => c.id === id || c.camera_id === id)

  useEffect(() => {
    if (!loading && !hasCameraAccess(id)) {
      nav('/access-denied', { replace: true })
    }
  }, [id, loading, hasCameraAccess, nav])

  // Initialize filters once camera is loaded
  useEffect(() => {
    if (cam && activeFilters.length === 0) {
        setActiveFilters(cam.enabled_usecases || [])
    }
  }, [cam])

  const toggleFilter = (uc) => {
    setActiveFilters(prev => 
        prev.includes(uc) ? prev.filter(f => f !== uc) : [...prev, uc]
    )
  }

  useEffect(() => {
    if (!cam) return
    let isMounted = true

    const fetchAll = async () => {
      try {
        const cid = cam.id || cam.camera_id

        // Unified calls: GET /api/analytics/traffic/{id} & /api/analytics/people/{id}
        const [trafficRes, peopleRes] = await Promise.allSettled([
          trafficAPI.getTrafficSnapshot(cid),
          trafficAPI.getPeopleCount(cid),
        ])

        if (!isMounted) return

        const traffic = trafficRes.status === 'fulfilled' ? trafficRes.value : null
        const people  = peopleRes.status  === 'fulfilled' ? peopleRes.value  : null

        // Aggregate Metrics
        setMetrics({
          congestion:   traffic ? { level: traffic.congestion_level, count: traffic.vehicle_count } : null,
          parking:      null,
          speeding:     traffic?.statistics || null,
          traffic_flow: traffic?.counts || null,
          people_flow:  people?.metrics  || null,
        })

        // Merge Detections into unified stream
        const freshEvents = []

        // Wrong-way events from traffic snapshot
        ;(traffic?.events || []).filter(e => e._service === 'wrong_way').forEach(e => freshEvents.push({
          ...e, _type: 'Wrong Way', _module: 'wrong_way', icon: AlertOctagon, color: '#dc2626',
          title: 'Violation', highlight: 'Wrong-Way Entry',
          timestamp: traffic.timestamp, track_id: `WW-${e.track_id}`,
        }))

        // Speed events from traffic snapshot
        ;(traffic?.events || []).filter(e => e._service === 'speed_detection').forEach(e => freshEvents.push({
          ...e, _type: 'Over-speed', _module: 'speeding', icon: Gauge,
          color: e.is_violation ? '#dc2626' : '#3b82f6',
          title: e.is_violation ? 'Critical Violation' : 'Speed Audit',
          highlight: `${e.speed_kmh} km/h`,
          timestamp: traffic.timestamp, track_id: `SP-${e.track_id}`,
        }))

        // People detections
        ;(people?.detections || []).forEach(d => freshEvents.push({
          ...d, _type: 'People Count', _module: 'people_count', icon: UserPlus, color: '#4f46e5',
          title: 'Person Detected', highlight: d.direction ? `FLOW: ${d.direction.toUpperCase()}` : 'In-Frame',
          track_id: d.tracking_id || d.id, timestamp: people.timestamp,
        }))

        setLiveEvents(prev => {
          const existingIds = new Set(prev.map(p => p.track_id || p.id))
          const uniqueNew   = freshEvents.filter(n => !existingIds.has(n.track_id || n.id))
          return [...uniqueNew, ...prev].slice(0, 15)
        })

        setApiLoading(false)
      } catch (err) {
        console.warn('[CameraAnalytics] fetch error:', err)
      }
    }

    fetchAll()
    const timer = setInterval(fetchAll, 2500)
    return () => { isMounted = false; clearInterval(timer) }
  }, [cam])

  if ((loading && cameras.length === 0) || (apiLoading && liveEvents.length === 0)) return <Loading msg="Universal AI Telemetry Sync..." />
  if (!hasCameraAccess(id)) return null
  if (!cam) return <div style={{ padding: 40, textAlign: 'center' }}>Stream Offline.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 100px)' }}>
      {/* Universal Header */}
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
             <div style={{ display: 'flex', gap: 6, marginLeft: 10 }}>
                {(cam.enabled_usecases || [])
                  .filter(uc => !['traffic', 'people_count', 'crowd_alert', 'intrusion'].includes(uc))
                  .map(uc => {
                    const isActive = activeFilters.includes(uc)
                    return (
                        <button 
                            key={uc} 
                            onClick={() => toggleFilter(uc)}
                            style={{ 
                                background: isActive ? '#2563eb' : '#f1f5f9', 
                                color: isActive ? '#fff' : '#475569', 
                                padding: '3px 10px', 
                                border: `1px solid ${isActive ? '#2563eb' : '#e2e8f0'}`, 
                                borderRadius: 20, 
                                fontSize: 10, 
                                fontWeight: 800, 
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            {uc.replace(/_/g, ' ')}
                            {isActive && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />}
                        </button>
                    )
                })}
             </div>
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
             {cam.location} • Stream ID: {cam.id || cam.camera_id} • Status: <span style={{ color: '#16a34a', fontWeight: 700 }}>LIVE</span>
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Main Visual Frame */}
          <div style={{ width: 500, flexShrink: 0, background: '#000', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <div style={{ width: '100%', height: 280, position: 'relative' }}>
               <MiniCanvas camera={cam} onClick={() => {}} onDoubleClick={() => nav(`/camera/${cam.id || cam.camera_id}`)} />
            </div>
            <div style={{ background: '#111', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #333' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', boxShadow: '0 0 8px #dc2626' }} />
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>INTELLIGENT EDGE STREAM</span>
               </div>
               <button onClick={() => nav(`/camera/${cam.id || cam.camera_id}`)} style={{ background: 'transparent', color: '#fff', border: '1px solid #444', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Maximize2 size={13} /> FULLSCREEN
               </button>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 18, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
             <h3 style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={15}/> Live Telemetry Overview</h3>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                
                {metrics.people_flow && activeFilters.includes('people_count') && (
                    <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8, border: '1px solid #dbeafe', gridColumn: 'span 2' }}>
                        <div style={{ fontSize: 9, color: '#1e40af', fontWeight: 800 }}>PEOPLE FOOTFALL</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#1e40af' }}>{metrics.people_flow.total} <span style={{ fontSize: 13, fontWeight: 600 }}>Total</span></div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>IN: {metrics.people_flow.count_in} / OUT: {metrics.people_flow.count_out}</div>
                        </div>
                    </div>
                )}

                {(metrics.traffic_flow || metrics.congestion || metrics.speeding) && (activeFilters.includes('vehicle_count') || activeFilters.includes('congestion') || activeFilters.includes('speeding')) && (
                    <>
                        {metrics.traffic_flow && activeFilters.includes('vehicle_count') && (
                            <>
                                <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #dcfce7' }}>
                                    <div style={{ fontSize: 9, color: '#166534', fontWeight: 800 }}>VEHICLE INFLOW</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: '#166534' }}>{metrics.traffic_flow.IN}</div>
                                </div>
                                <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, border: '1px solid #fee2e2' }}>
                                    <div style={{ fontSize: 9, color: '#991b1b', fontWeight: 800 }}>VEHICLE OUTFLOW</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: '#991b1b' }}>{metrics.traffic_flow.OUT}</div>
                                </div>
                            </>
                        )}
                        
                        {metrics.speeding && activeFilters.includes('speeding') && (
                            <div style={{ background: '#f0f9ff', padding: 12, borderRadius: 8, border: '1px solid #e0f2fe', gridColumn: 'span 2' }}>
                                <div style={{ fontSize: 9, color: '#0369a1', fontWeight: 800 }}>VELOCITY METRICS</div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#0369a1', marginTop: 4 }}>{metrics.speeding.average_speed} <span style={{ fontSize: 11 }}>KM/H AVG</span></div>
                            </div>
                        )}

                        {metrics.congestion && activeFilters.includes('congestion') && (
                            <div style={{ background: metrics.congestion.level === 'high' ? '#fee2e2' : '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 800 }}>DENSITY / CONGESTION</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: metrics.congestion.level === 'high' ? '#ef4444' : 'var(--text)' }}>{metrics.congestion.level.toUpperCase()}</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>{metrics.congestion.count} Units In-Frame</div>
                                </div>
                            </div>
                        )}
                    </>
                )}
             </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
           <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                 <RefreshCcw size={18} color="#2563eb" /> Universal Detection Log
              </h2>
           </div>
           <div style={{ overflowX: 'auto', maxHeight: 400 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <tr>
                    <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Reference</th>
                    <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Classification</th>
                    <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Observation</th>
                    <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Reason / Location</th>
                    <th style={{ padding: '16px 20px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {liveEvents
                    .filter(ev => activeFilters.includes(ev._module))
                    .map((ev, idx) => {
                    const Icon = ev.icon
                    return (
                      <tr key={`${ev.track_id}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 20px' }}>
                           <div style={{ fontWeight: 900, fontSize: 12, color: 'var(--text)' }}>#{ev.track_id || 'ID-EXT'}</div>
                           {ev.plate_number && <div style={{ background: '#1e293b', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 900, marginTop: 4, display: 'inline-block' }}>{ev.plate_number}</div>}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: ev.color || '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                             <Icon size={16} /> {ev._type}
                           </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                           <div style={{ fontSize: 13, fontWeight: 800, color: ev.color || 'var(--text)' }}>
                             {ev.highlight}
                           </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                           {ev.reason && (
                               <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ea580c', fontWeight: 700, fontSize: 12 }}>
                                   <Shield size={14} /> {ev.reason}
                               </div>
                           )}
                           {ev.location && (
                               <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontWeight: 700, fontSize: 12 }}>
                                   <MapPin size={14} /> {ev.location}
                               </div>
                           )}
                           {!ev.reason && !ev.location && <span style={{ color: 'var(--text-3)', fontSize: 12 }}>-</span>}
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
