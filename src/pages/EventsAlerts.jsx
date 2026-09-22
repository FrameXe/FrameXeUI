import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCameras } from '../hooks/useCameras.js'
import { useAllAlerts } from '../hooks/useAlerts.js'
import { USE_CASES, UC_MAP } from '../constants/useCases.js'
import { Loading } from '../components/shared/index.jsx'
import { useAuthStore } from '../store/index.js'
import SSEStatusDot from '../components/SSEStatusDot.jsx'
import { 
  AlertTriangle, Shield, Camera, X, Users, Download, Maximize2, 
  CheckCircle2, Search, Filter
} from 'lucide-react'

const T = {
  bg: 'var(--bg)',
  card: 'var(--surface)',
  border: 'var(--border)',
  text: 'var(--text)',
  textSecondary: 'var(--text-2)',
  textMuted: 'var(--text-3)',
  accent: 'var(--accent)',
  accentLight: 'var(--accent-bg)',
  danger: '#ef4444',
  shadow: 'var(--shadow)',
  radius: 12,
}

const SEV = {
  critical: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444', badge: '#ef4444' },
  high:     { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', color: '#f97316', badge: '#f97316' },
  medium:   { bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)', color: '#eab308', badge: '#eab308' },
  low:      { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', color: '#22c55e', badge: '#22c55e' },
}

export default function EventsAlerts() {
  const nav = useNavigate()
  const { cameras, loading: camsLoading } = useCameras()
  const { alerts, loading: alertsLoading, ack, unread, connected } = useAllAlerts(cameras)
  const user = useAuthStore(s => s.user)
  const allowedUsecases = user?.allowedUsecases || []

  const [selectedUCs, setSelectedUCs] = useState([]) // Array for multi-select
  const [camSearch, setCamSearch] = useState('')
  const [camIdFilter, setCamIdFilter] = useState('') 
  const [sevFilter, setSevFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active') 
  const [viewingSnap, setViewingSnap] = useState(null)
  
  const [searchParams, setSearchParams] = useSearchParams()
  const urlAlertId = searchParams.get('alertId')
  const autoOpenedRef = useRef(false)

  useEffect(() => {
    if (urlAlertId && alerts.length > 0 && !autoOpenedRef.current) {
       const found = alerts.find(a => a.id === urlAlertId)
       if (found) {
         setViewingSnap(found)
         autoOpenedRef.current = true
       }
    }
    if (!urlAlertId) {
       autoOpenedRef.current = false
     }
  }, [urlAlertId, alerts])

  const searchStr = camSearch.toLowerCase().trim()
  const filteredAlerts = alerts.filter(a => {
    if (urlAlertId) return a.id === urlAlertId;
    
    // Filter by allowed use cases
    if (allowedUsecases.length > 0 && !allowedUsecases.includes(a.usecase)) {
      return false
    }

    return (
      (selectedUCs.length === 0 || selectedUCs.includes(a.usecase)) &&
      (!camIdFilter || a.cameraId === camIdFilter) &&
      (!searchStr || a.cameraId?.toLowerCase().includes(searchStr) || a.cameraName?.toLowerCase().includes(searchStr)) &&
      (!sevFilter || a.severity === sevFilter) &&
      (statusFilter === 'active' ? !a.acknowledged : a.acknowledged)
    )
  })

  const toggleUC = (id) => {
    setSelectedUCs(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleDownload = (e, a) => {
    e.stopPropagation()
    const href = a.fullResUrl || a.thumbnailUrl
    if (!href) return   // nothing to download for this incident
    const link = document.createElement('a')
    link.href = href
    link.download = `incident_${a.id}.jpg`
    link.click()
  }

  if ((camsLoading && cameras.length === 0) || (alertsLoading && alerts.length === 0)) return <Loading msg="Synchronizing Intelligence Feed…" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 30 }}>
       {/* INSPECTION MODAL */}
      {viewingSnap && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }} onClick={() => setViewingSnap(null)}>
           <div style={{ background: 'var(--surface)', borderRadius: 20, width: '92%', maxWidth: 1080, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }} onClick={e=>e.stopPropagation()}>
              <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                 <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Incident Evidence Center</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>ID: {viewingSnap.id} | Camera: {viewingSnap.cameraName}</div>
                 </div>
                  <button onClick={() => setViewingSnap(null)} style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', padding: 8, borderRadius: 30, cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {viewingSnap.fullResUrl || viewingSnap.thumbnailUrl ? (
                    <img src={viewingSnap.fullResUrl || viewingSnap.thumbnailUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Snapshot" />
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>No snapshot captured for this incident</div>
                  )}
              </div>
              <div style={{ padding: '24px', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                 <button onClick={(e) => handleDownload(e, viewingSnap)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>
                    <Download size={18} /> DOWNLOAD PNG
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            System Safety Center
          </h1>
          <SSEStatusDot connected={connected} showLabel />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
           {urlAlertId && (
             <button onClick={() => setSearchParams({})} style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
               CLEAR ALERT FILTER
             </button>
           )}
           <button onClick={() => alerts.filter(a => !a.acknowledged).forEach(a => ack(a.cameraId, a.id))} 
             style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)' }}>
             RESOLVE ALL ({unread})
           </button>
        </div>
      </div>

      {/* INTELLIGENCE SUITE TILES - COMPACT DIFFERENTIATED FILTER PANEL */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: '3px solid #f59e0b',
        borderRadius: 12,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: '0 2px 10px rgba(245, 158, 11, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
             <Filter size={13} style={{ color: '#f59e0b' }} />
             <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
               Filter by Intelligence Suites
             </span>
             <span className="ai-badge" style={{
               fontSize: 8.5, padding: '1px 6px',
               background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
               border: '1px solid rgba(245,158,11,0.3)'
             }}>
               MULTI-SELECT
             </span>
           </div>
           {selectedUCs.length > 0 && (
             <button onClick={()=>setSelectedUCs([])} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
               CLEAR SELECTION ({selectedUCs.length})
             </button>
           )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
          {USE_CASES.filter(u => !user?.allowedUsecases || user.allowedUsecases.includes(u.id)).map(u => {
            const isActive = selectedUCs.includes(u.id)
            const ucAlerts = alerts.filter(a => a.usecase === u.id && !a.acknowledged).length
            return (
              <div key={u.id} onClick={() => toggleUC(u.id)}
                style={{
                  background: isActive ? `${u.color}15` : 'var(--surface-2)',
                  border: `1px solid ${isActive ? u.color : 'var(--border)'}`,
                  borderLeft: `3px solid ${u.color}`,
                  borderRadius: 8,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = u.color
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.borderLeftColor = u.color
                  }
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 14 }}>{u.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? u.color : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {ucAlerts > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', fontSize: 8.5, fontWeight: 900, padding: '1px 5px', borderRadius: 8 }}>
                      {ucAlerts}
                    </span>
                  )}
                  {isActive && <CheckCircle2 size={12} style={{ color: u.color }} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* FILTER CONTROL CENTER */}
      <div style={{ background: 'var(--surface)', border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: T.shadow, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, background: 'var(--surface-2)', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incident Status</span>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} 
                style={{ background: 'var(--surface)', border: `1px solid ${T.border}`, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, outline: 'none', color: statusFilter === 'active' ? '#dc2626' : '#16a34a' }}>
                 <option value="active" style={{ color: '#dc2626' }}>● Active Incidents</option>
                 <option value="resolved" style={{ color: '#16a34a' }}>● Resolved History</option>
              </select>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Node Selection</span>
              <select value={camIdFilter} onChange={e => setCamIdFilter(e.target.value)} 
                style={{ background: 'var(--surface)', border: `1px solid ${T.border}`, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, outline: 'none', width: 200, color: 'var(--text)' }}>
                 <option value="">All Nodes</option>
                 {cameras.map(c => <option key={c.id || c.camera_id} value={c.id || c.camera_id}>{c.name || (c.id || c.camera_id)}</option>)}
              </select>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alert Escalation</span>
              <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} 
                style={{ background: 'var(--surface)', border: `1px solid ${T.border}`, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, outline: 'none', width: 170, color: 'var(--text)' }}>
                 <option value="">Any Severity</option>
                 <option value="critical" style={{ color: '#ef4444' }}>Critical</option>
                 <option value="high" style={{ color: '#f97316' }}>High Priority</option>
                 <option value="medium" style={{ color: '#eab308' }}>Medium Risk</option>
                 <option value="low" style={{ color: '#22c55e' }}>Low Severity</option>
              </select>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keyword Search</span>
              <div style={{ position: 'relative' }}>
                 <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
                 <input type="text" placeholder="Search Camera / ID / Zone..." value={camSearch} onChange={e=>setCamSearch(e.target.value)} 
                   style={{ width: '100%', background: 'var(--surface)', color: 'var(--text)', border: `1px solid ${T.border}`, padding: '10px 16px 10px 38px', borderRadius: 10, fontSize: 13, outline: 'none', fontWeight: 600 }} />
                 {camSearch && <button onClick={()=>setCamSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)' }}><X size={14} /></button>}
              </div>
           </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--surface-2)', borderBottom: `1px solid ${T.border}` }}>
                <tr>
                   {['Status', 'Incident Frame', 'Security Alert', 'Node Source', 'Escalation', 'Timeline', 'Command'].map(h=>(
                     <th key={h} style={{ padding: '14px 24px', textAlign: 'left', fontSize: 11, color: T.textMuted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                   ))}
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.length === 0 ? <tr><td colSpan={7} style={{ padding: 80, textAlign: 'center', color: T.textMuted, fontWeight: 500 }}>Global state clear. No results for the selected combination.</td></tr> : (
                  filteredAlerts.map((a, i) => {
                    const s = SEV[a.severity] || SEV.low
                    const rowBg = a.acknowledged ? 'var(--surface-2)' : s.bg
                    const rowBorder = a.acknowledged ? 'var(--border)' : s.border
                    return (
                      <tr key={a.id} 
                        style={{ borderBottom: `1px solid ${rowBorder}`, background: rowBg, opacity: a.acknowledged ? 0.7 : 1, transition: 'all 0.2s ease' }}
                        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.98)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                        <td style={{ padding: '16px 24px' }}><div style={{ width: 14, height: 14, borderRadius: '50%', background: s.badge, boxShadow: a.acknowledged ? 'none' : `0 0 10px ${s.badge}55` }} /></td>
                        <td style={{ padding: '16px 14px' }}>
                           <div onClick={() => setViewingSnap(a)}
                             style={{
                               width: 160, height: 90, background: 'var(--surface-2)', borderRadius: 12, overflow: 'hidden',
                               position: 'relative', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.3s'
                             }}>
                              {a.thumbnailUrl || a.fullResUrl ? (
                                <img src={a.thumbnailUrl || a.fullResUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Snapshot" />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }}>NO SNAPSHOT</div>
                              )}
                              <div style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', gap: 6 }}>
                                 <button onClick={(e) => handleDownload(e, a)} style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', padding: 4, borderRadius: 6, display: 'flex' }}><Download size={12} /></button>
                                 <div style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', padding: 4, borderRadius: 6, display: 'flex' }}><Maximize2 size={12} /></div>
                              </div>
                           </div>
                        </td>
                        <td style={{ padding: '16px 24px', fontWeight: 800, color: T.text, fontSize: 13 }}>{a.message}</td>
                        <td style={{ padding: '16px 24px' }}>
                           <div style={{ fontSize: 14, fontWeight: 900, color: T.text }}>{a.cameraName}</div>
                           <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>ID: {a.cameraId}</div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                           <span style={{ fontSize: 10, fontWeight: 900, padding: '4px 12px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{a.severity.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: 12, color: T.textSecondary, fontWeight: 600 }}>{new Date(a.timestamp).toLocaleString()}</td>
                        <td style={{ padding: '16px 24px' }}>
                           <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                             <button onClick={() => nav(`/camera/${a.cameraId}/${a.usecase}`)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 10, fontSize: 11, fontWeight: 800, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                               <Maximize2 size={14} /> DETAILS
                             </button>
                             {!a.acknowledged ? (
                               <button onClick={() => ack(a.cameraId, a.id)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px 18px', borderRadius: 10, fontSize: 11, fontWeight: 900, color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                 <CheckCircle2 size={16} /> RESOLVE
                               </button>
                             ) : (
                               <div style={{ color: 'var(--green)', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <CheckCircle2 size={14} /> RESOLVED
                               </div>
                             )}
                           </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  )
}