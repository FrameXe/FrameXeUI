import { useState, useEffect } from 'react'
import { USE_MOCK } from '../../config/index.js'

export default function TopBar() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const iv = setInterval(() => setT(new Date()), 1000); return () => clearInterval(iv) }, [])

  return (
    <header style={{ background:'#060d18', borderBottom:'1px solid #0d1e2e', padding:'9px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <div>
          <span style={{ fontSize:13, fontWeight:'bold', letterSpacing:3, color:'#c8d8e8' }}>VIDEO</span>
          <span style={{ fontSize:13, fontWeight:'bold', letterSpacing:3, color:'#00cfff', marginLeft:6 }}>ANALYTICS</span>
        </div>
        <div style={{ height:14, width:1, background:'#0d2030' }}/>
        <span style={{ fontSize:9, color:'#2a4050', letterSpacing:2 }}>ACME CORP</span>
        <span style={{ fontSize:9, background: USE_MOCK ? 'rgba(255,214,0,0.12)' : 'rgba(0,255,136,0.12)', border:`1px solid ${USE_MOCK?'#ffd60044':'#00ff8844'}`, color: USE_MOCK?'#ffd600':'#00ff88', padding:'1px 8px', letterSpacing:2 }}>
          {USE_MOCK ? 'MOCK' : 'LIVE API'}
        </span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <span style={{ fontSize:10, color:'#4a6070', letterSpacing:1 }}>{t.toLocaleTimeString()}</span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div className="live-dot" style={{ width:6, height:6, borderRadius:'50%', background:'#00ff88', color:'#00ff88' }}/>
          <span style={{ fontSize:10, color:'#00ff88', letterSpacing:2 }}>LIVE</span>
        </div>
      </div>
    </header>
  )
}
