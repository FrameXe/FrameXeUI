import { useNavigate } from 'react-router-dom'
import { Camera, Activity, AlertTriangle, CheckCircle } from 'lucide-react'
import { useCameras } from '../hooks/useCameras.js'
import { useAlerts }  from '../hooks/useAlerts.js'
import { USE_CASES }  from '../constants/useCases.js'
import { KpiCard, Loading, SEV_COLOR } from '../components/shared/index.jsx'

export default function Dashboard() {
  const nav = useNavigate()
  const { cameras, loading } = useCameras()
  const { alerts, unread }   = useAlerts()

  const active = cameras.filter(c => c.status === 'active').length
  const errors = cameras.filter(c => c.status === 'error').length
  const health = cameras.length ? Math.round(active / cameras.length * 100) : 0

  if (loading) return <Loading msg="LOADING DASHBOARD…"/>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <div>
        <h2 style={{ margin:0, fontSize:18, letterSpacing:3, color:'#c8d8e8' }}>DASHBOARD</h2>
        <div style={{ fontSize:11, color:'#2a4050', marginTop:3 }}>System overview</div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        <KpiCard title="TOTAL CAMERAS"  value={cameras.length} color="#00cfff" icon={Camera}/>
        <KpiCard title="ACTIVE"         value={active}         color="#00ff88" icon={Activity}/>
        <KpiCard title="UNACKED ALERTS" value={unread}         color="#ff3b3b" icon={AlertTriangle}/>
        <KpiCard title="SYSTEM HEALTH"  value={`${health}%`}   color="#00ff88" icon={CheckCircle} sub={errors > 0 ? `${errors} cameras in error` : 'All good'}/>
      </div>

      {/* Use case cards */}
      <div>
        <div style={{ fontSize:11, color:'#2a4050', letterSpacing:3, marginBottom:12 }}>USE CASES</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
          {USE_CASES.map(uc => {
            const ucCams   = cameras.filter(c => c.useCase === uc.id)
            const ucActive = ucCams.filter(c => c.status === 'active').length
            return (
              <div key={uc.id} onClick={() => nav(`/use-case/${uc.id}`)}
                style={{ background:'#0a111e', border:`1px solid ${uc.color}22`, padding:16, cursor:'pointer', transition:'all 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=uc.color+'66'; e.currentTarget.style.transform='scale(1.02)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=uc.color+'22'; e.currentTarget.style.transform='scale(1)' }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <span style={{ fontSize:22 }}>{uc.emoji}</span>
                  <span style={{ fontSize:24, fontWeight:'bold', color:uc.color }}>{ucCams.length}</span>
                </div>
                <div style={{ marginTop:10, fontSize:12, fontWeight:'bold', color:'#c8d8e8' }}>{uc.label}</div>
                <div style={{ fontSize:9, color:'#2a4050', marginTop:4 }}>{ucActive} active cameras</div>
                <div style={{ marginTop:10, height:1, background:`linear-gradient(90deg,${uc.color}44,transparent)` }}/>
                <div style={{ marginTop:8, fontSize:9, color:uc.color, letterSpacing:1 }}>VIEW DETAILS →</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent alerts */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:11, color:'#2a4050', letterSpacing:3 }}>RECENT UNACKNOWLEDGED ALERTS</div>
          <button onClick={() => nav('/events')} style={{ background:'transparent', border:'1px solid #0d2030', color:'#4a6070', padding:'4px 12px', fontSize:9, letterSpacing:1 }}>VIEW ALL →</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {alerts.filter(a => !a.acknowledged).slice(0, 6).map(a => (
            <div key={a.id} style={{ background:'#0a111e', border:`1px solid ${SEV_COLOR[a.severity]}22`, padding:'8px 14px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:SEV_COLOR[a.severity], boxShadow:`0 0 6px ${SEV_COLOR[a.severity]}`, flexShrink:0 }}/>
              <span style={{ fontSize:11, color:'#7090a0', flex:1 }}>{a.message}</span>
              <span style={{ fontSize:9, color:SEV_COLOR[a.severity], letterSpacing:1 }}>{a.severity?.toUpperCase()}</span>
              <span style={{ fontSize:9, color:'#1e3040' }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
