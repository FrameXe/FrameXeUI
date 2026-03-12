export function KpiCard({ title, value, color = '#00cfff', icon: Icon, sub }) {
  return (
    <div style={{ background:'#0a111e', border:`1px solid ${color}22`, padding:'16px 18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:9, color:'#2a4050', letterSpacing:2, marginBottom:8 }}>{title}</div>
          <div style={{ fontSize:30, fontWeight:'bold', color, lineHeight:1 }}>{value}</div>
          {sub && <div style={{ fontSize:9, color:'#2a4050', marginTop:6 }}>{sub}</div>}
        </div>
        {Icon && <Icon size={22} style={{ color, opacity:0.35 }}/>}
      </div>
    </div>
  )
}

export function Loading({ msg = 'LOADING…' }) {
  return <div style={{ padding:60, textAlign:'center', fontSize:11, color:'#2a4050', letterSpacing:3 }}>{msg}</div>
}

export function Empty({ msg = 'NO DATA' }) {
  return <div style={{ padding:60, textAlign:'center', fontSize:11, color:'#1e3040', letterSpacing:3, border:'1px dashed #0d2030' }}>{msg}</div>
}

export function Btn({ children, onClick, active = false, color = '#7090a0', style: sx }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? color+'66' : '#1e3040'}`,
      color: active ? color : '#7090a0',
      padding:'5px 12px', fontSize:10, letterSpacing:1, cursor:'pointer',
      ...sx,
    }}>{children}</button>
  )
}

export function Tag({ children, color }) {
  return (
    <span style={{ fontSize:9, background:`${color}15`, border:`1px solid ${color}33`, color, padding:'2px 8px', letterSpacing:2 }}>
      {children}
    </span>
  )
}

export const SEV_COLOR = { critical:'#ff3b3b', high:'#ff8c00', medium:'#ffd600', low:'#4a6070' }
