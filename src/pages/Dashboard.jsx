import { useNavigate } from 'react-router-dom'
import { Camera, Activity, AlertTriangle, TrendingUp, Users, Zap, Shield, ChevronRight } from 'lucide-react'
import { useCameras } from '../hooks/useCameras.js'
import { useAllAlerts } from '../hooks/useAlerts.js'
import { USE_CASES } from '../constants/useCases.js'
import { KpiCard, Loading, SEV_STYLE } from '../components/shared/index.jsx'
import { useAuthStore } from '../store/index.js'

export default function Dashboard() {
  const nav = useNavigate()
  const { cameras, loading } = useCameras()
  const { alerts, unread } = useAllAlerts(cameras)
  const user = useAuthStore(s => s.user)
  const allowedUsecases = user?.allowedUsecases || []

  const active = cameras.filter(c => c.status === 'active').length
  const errors = cameras.filter(c => c.status === 'error').length
  const health = cameras.length ? Math.round(active / cameras.length * 100) : 0

  if (loading && cameras.length === 0) return <Loading msg="Synchronizing Intelligence Data…" />

  const ucGroups = {}
  cameras.forEach(cam => {
    (cam.enabled_usecases || [cam.useCase] || []).forEach(uc => {
      if (!ucGroups[uc]) ucGroups[uc] = []
      ucGroups[uc].push(cam)
    })
  })

  /* Sort alerts by time desc and get top 8 unacknowledged */
  const recentAlerts = alerts
    .filter(a => !a.acknowledged)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Command Dashboard</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>
            Unified operational overview of all active intelligence nodes.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
           <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase' }}>System Live</span>
           </div>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {[
          { icon: Camera, label: 'Camera Nodes', value: cameras.length, color: '#4f6df5', sub: `${active} Online`, path: '/cameras' },
          { icon: Zap, label: 'System Health', value: `${health}%`, color: health > 80 ? '#22c55e' : '#f59e0b', sub: errors > 0 ? `${errors} Error Nodes` : 'All Optimal' },
          { icon: AlertTriangle, label: 'Active Alerts', value: unread, color: '#ef4444', sub: 'Action Required', path: '/events' },
          { icon: Shield, label: 'Intelligence Level', value: 'High', color: '#8b5cf6', sub: `${USE_CASES.length} Active Suites` },
        ].map((kpi, i) => (
          <div key={i} 
            onClick={() => kpi.path && nav(kpi.path)}
            style={{ 
              background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', 
              boxShadow: 'var(--shadow)', borderTop: `4px solid ${kpi.color}`,
              cursor: kpi.path ? 'pointer' : 'default',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={e => { if(kpi.path) e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { if(kpi.path) e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
               <div style={{ width: 36, height: 36, borderRadius: 10, background: `${kpi.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <kpi.icon size={18} style={{ color: kpi.color }} />
               </div>
               <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, fontWeight: 500 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 3fr)', gap: 32 }}>
        
        {/* Intelligence Suites */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>Intelligence Suites</h2>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Click to explore suite analytics</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {USE_CASES.filter(uc => allowedUsecases.includes(uc.id)).map(uc => {
              const ucCams = ucGroups[uc.id] || []
              return (
                <div key={uc.id}
                  onClick={() => nav(`/use-case/${uc.id}`)}
                  style={{
                    background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: '24px',
                    cursor: 'pointer', boxShadow: 'var(--shadow)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative', overflow: 'hidden'
                  }}
                  onMouseEnter={e => { 
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.borderColor = uc.color + '66'
                  }}
                  onMouseLeave={e => { 
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${uc.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: `1px solid ${uc.color}22` }}>{uc.emoji}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>{ucCams.length}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.01em' }}>{uc.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginTop: 4 }}>Analyzing system-wide feeds</div>
                  <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: uc.color }}>
                     EXPLORE MODULE <ChevronRight size={14} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RECENT ALERTS (POLISHED WITH SNAPSHOTS) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>Recent Security Events</h2>
            <button onClick={() => nav('/events')} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>ALL LOGS →</button>
          </div>
          
          {recentAlerts.length === 0 ? (
            <div style={{ padding: 40, background: '#fff', border: '1px dashed var(--border)', borderRadius: 20, textAlign: 'center', fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>
              No critical events in the last 24h. System is secured. ✅
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentAlerts.map((a, i) => {
                const s = SEV_STYLE[a.severity] || SEV_STYLE.medium
                return (
                  <div key={a.id} 
                    onClick={() => nav(`/camera/${a.cameraId}/${a.usecase}`)}
                    style={{ 
                      background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 16px', 
                      display: 'flex', gap: 14, cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                     {/* SNAPSHOT PREVIEW — real incident frame */}
                     <div style={{ width: 80, height: 45, borderRadius: 8, background: '#f1f5f9', flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                         {a.thumbnailUrl || a.fullResUrl ? (
                           <img 
                             src={a.thumbnailUrl || a.fullResUrl} 
                             style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                             alt="Incident" 
                             onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                           />
                         ) : null}
                         <div style={{ 
                           width: '100%', height: '100%', display: a.thumbnailUrl || a.fullResUrl ? 'none' : 'flex',
                           alignItems: 'center', justifyContent: 'center', fontSize: 18
                         }}>🎥</div>
                     </div>
                     
                     <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.message}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{a.cameraName} · {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                     </div>
                     
                     <div style={{ padding: '2px 10px', borderRadius: 20, fontSize: 9, fontWeight: 900, height: 'fit-content', background: s.bg, border: `1px solid ${s.border}`, color: s.color, textTransform: 'uppercase' }}>
                        {a.severity}
                     </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}