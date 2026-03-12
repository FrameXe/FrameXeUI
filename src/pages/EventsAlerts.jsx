import { useAlerts } from '../hooks/useAlerts.js'
import { Loading, SEV_COLOR } from '../components/shared/index.jsx'

const TYPE_ICON = { intrusion:'🚨', speed:'⚡', offline:'📵', lpr:'🔲', people:'👥' }

export default function EventsAlerts() {
  const { alerts, loading, ack, ackAll, unread } = useAlerts()

  if (loading) return <Loading msg="LOADING ALERTS…"/>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:14, borderBottom:'1px solid #0d1e2e' }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, letterSpacing:3, color:'#c8d8e8' }}>EVENTS & ALERTS</h2>
          <div style={{ fontSize:11, color:'#2a4050', marginTop:3 }}>{unread} unacknowledged</div>
        </div>
        {unread > 0 && (
          <button onClick={ackAll} style={{ background:'rgba(255,107,107,0.1)', border:'1px solid #ff6b6b44', color:'#ff6b6b', padding:'6px 16px', fontSize:10, letterSpacing:1 }}>
            ACK ALL ({unread})
          </button>
        )}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {alerts.map(a => (
          <div key={a.id} style={{
            background: a.acknowledged ? 'transparent' : '#0a111e',
            border: `1px solid ${a.acknowledged ? '#0a1220' : SEV_COLOR[a.severity]+'33'}`,
            padding:'10px 14px',
            display:'flex', alignItems:'center', gap:12,
            opacity: a.acknowledged ? 0.4 : 1,
            transition:'all 0.2s',
          }}>
            <span style={{ fontSize:16, flexShrink:0 }}>{TYPE_ICON[a.type] || '⚠'}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color: a.acknowledged ? '#4a6070' : '#c8d8e8' }}>{a.message}</div>
              <div style={{ fontSize:9, color:'#2a4050', marginTop:3 }}>
                {a.cameraName} • {a.location} • {new Date(a.timestamp).toLocaleString()}
              </div>
            </div>
            <span style={{ fontSize:9, color:SEV_COLOR[a.severity], letterSpacing:1, flexShrink:0 }}>{a.severity?.toUpperCase()}</span>
            {!a.acknowledged && (
              <button onClick={() => ack(a.id)} style={{ background:'transparent', border:'1px solid #0d2030', color:'#4a6070', padding:'3px 10px', fontSize:9, letterSpacing:1, flexShrink:0 }}>
                ACK
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
