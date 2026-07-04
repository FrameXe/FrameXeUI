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
  bg: '#f8f9fc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#1a202c',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  accent: '#4f6df5',
  accentLight: '#eef2ff',
  danger: '#ef4444',
  shadow: '0 4px 12px rgba(0,0,0,0.05)',
  radius: 12,
}

const SEV = {
  critical: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', badge: '#ef4444' },
  high: { bg: '#fff7ed', border: '#fed7aa', color: '#ea580c', badge: '#f97316' },
  medium: { bg: '#fefce8', border: '#fde68a', color: '#ca8a04', badge: '#eab308' },
  low: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', badge: '#22c55e' },
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
    const link = document.createElement('a')
    link.href = 'https://picsum.photos/1280/720'
    link.download = `incident_${a.id}.jpg`
    link.click()
  }

  if ((camsLoading && cameras.length === 0) || (alertsLoading && alerts.length === 0)) return <Loading msg="Synchronizing Intelligence Feed…" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 60 }}>

      {/* INSPECTION MODAL */}
      {viewingSnap && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }} onClick={() => setViewingSnap(null)}>
           <div style={{ background: '#fff', borderRadius: 20, width: '92%', maxWidth: 1080, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.4)' }} onClick={e=>e.stopPropagation()}>
              <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
                 <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Incident Evidence Center</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>ID: {viewingSnap.id} | Camera: {viewingSnap.cameraName}</div>
                 </div>
                 <button onClick={() => setViewingSnap(null)} style={{ background: '#f5f5f5', border: 'none', padding: 8, borderRadius: 30, cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <img src="https://picsum.photos/1280/720" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Snapshot" />
              </div>
              <div style={{ padding: '24px', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#fafafa' }}>
                 <button onClick={(e) => handleDownload(e, viewingSnap)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>
                    <Download size={18} /> DOWNLOAD PNG
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: T.text, letterSpacing: '-0.03em' }}>System Safety Center</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <p style={{ margin: 0, fontSize: 14, color: T.textSecondary, fontWeight: 500 }}>Global monitoring and forensic investigation suite.</p>
            <SSEStatusDot connected={connected} showLabel />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
           {urlAlertId && (
             <button onClick={() => setSearchParams({})} style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '10px 24px', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
               CLEAR ALERT FILTER
             </button>
           )}
           <button onClick={() => alerts.filter(a => !a.acknowledged).forEach(a => ack(a.cameraId, a.id))} 
             style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 16px rgba(239, 68, 68, 0.2)' }}>
             RESOLVE ALL ({unread})
           </button>
        </div>
      </div>

      {/* INTELLIGENCE SUITE TILES - MULTI SELECT */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
           <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Filter by Intelligence Suites (Select Multiple)</span>
           {selectedUCs.length > 0 && <button onClick={()=>setSelectedUCs([])} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>CLEAR SELECTION</button>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {USE_CASES.filter(u => !user?.allowedUsecases || user.allowedUsecases.includes(u.id)).map(u => {
            const isActive = selectedUCs.includes(u.id)
            const ucAlerts = alerts.filter(a => a.usecase === u.id && !a.acknowledged).length
            return (
              <div key={u.id} onClick={() => toggleUC(u.id)}
                style={{
                  background: isActive ? `${u.color}15` : '#fff', border: `2px solid ${isActive ? u.color : T.border}`,
                  borderRadius: 16, padding: '16px 20px', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: isActive ? `0 10px 20px ${u.color}15` : T.shadow,
                  transform: isActive ? 'translateY(-2px)' : 'none',
                  position: 'relative'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 24 }}>{u.emoji}</span>
                  {ucAlerts > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 20 }}>{ucAlerts}</span>}
                </div>
                <div style={{ marginTop: 10, fontSize: 14, fontWeight: 800, color: isActive ? u.color : T.text }}>{u.label}</div>
                {isActive && <CheckCircle2 size={16} style={{ position: 'absolute', bottom: 12, right: 12, color: u.color }} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* FILTER CONTROL CENTER */}
      <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 20, boxShadow: T.shadow, overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: `1px solid ${T.border}`, background: '#fafbfd', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incident Status</span>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} 
                style={{ background: '#fff', border: `1px solid ${T.border}`, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, outline: 'none', color: statusFilter === 'active' ? '#dc2626' : '#16a34a' }}>
                 <option value="active" style={{ color: '#dc2626' }}>● Active Incidents</option>
                 <option value="resolved" style={{ color: '#16a34a' }}>● Resolved History</option>
              </select>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Node Selection</span>
              <select value={camIdFilter} onChange={e => setCamIdFilter(e.target.value)} 
                style={{ background: '#fff', border: `1px solid ${T.border}`, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, outline: 'none', width: 200 }}>
                 <option value="">All Nodes</option>
                 {cameras.map(c => <option key={c.id || c.camera_id} value={c.id || c.camera_id}>{c.name || (c.id || c.camera_id)}</option>)}
              </select>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alert Escalation</span>
              <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} 
                style={{ background: '#fff', border: `1px solid ${T.border}`, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, outline: 'none', width: 170 }}>
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
                   style={{ width: '100%', background: '#fff', border: `1px solid ${T.border}`, padding: '10px 16px 10px 38px', borderRadius: 10, fontSize: 13, outline: 'none', fontWeight: 600 }} />
                 {camSearch && <button onClick={()=>setCamSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={14} /></button>}
              </div>
           </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc', borderBottom: `1px solid ${T.border}` }}>
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
                    const rowBg = a.acknowledged ? '#f8fafc' : s.bg
                    const rowBorder = a.acknowledged ? '#f1f5f9' : s.border
                    return (
                      <tr key={a.id} 
                        style={{ borderBottom: `1px solid ${rowBorder}`, background: rowBg, opacity: a.acknowledged ? 0.7 : 1, transition: 'all 0.2s ease' }}
                        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.98)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                        <td style={{ padding: '16px 24px' }}><div style={{ width: 14, height: 14, borderRadius: '50%', background: s.badge, boxShadow: a.acknowledged ? 'none' : `0 0 10px ${s.badge}55` }} /></td>
                        <td style={{ padding: '16px 14px' }}>
                           <div onClick={() => setViewingSnap(a)}
                             style={{ 
                               width: 160, height: 90, background: '#f1f5f9', borderRadius: 12, overflow: 'hidden', 
                               position: 'relative', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.3s'
                             }}>
                              <img src="https://picsum.photos/320/180" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Snapshot" />
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
                               <button onClick={() => ack(a.cameraId, a.id)} style={{ background: '#fff', border: '1px solid var(--border)', padding: '10px 18px', borderRadius: 10, fontSize: 11, fontWeight: 900, color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
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