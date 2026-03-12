import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Camera, FileText, AlertTriangle, ChevronDown } from 'lucide-react'
import { USE_CASES } from '../../constants/useCases.js'
import { useAlertStore } from '../../store/index.js'

const lnk = (active, color='#4a6070') => ({
  display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
  cursor:'pointer', borderRadius:2, marginBottom:2, textDecoration:'none',
  background: active ? `${color}12` : 'transparent',
  borderLeft: active ? `2px solid ${color}` : '2px solid transparent',
  color: active ? color : '#4a6070',
  transition:'all 0.15s', fontSize:11, letterSpacing:1,
})

export default function Sidebar() {
  const loc    = useLocation()
  const unread = useAlertStore(s => s.alerts.filter(a => !a.acknowledged).length)
  const isEvt  = loc.pathname.startsWith('/use-case') || loc.pathname.startsWith('/events')
  const [open, setOpen] = useState(isEvt)

  return (
    <aside style={{ width:218, background:'#060d18', borderRight:'1px solid #0d1e2e', display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto' }}>
      <nav style={{ padding:'12px 8px', flex:1 }}>
        <NavLink to="/" end style={({ isActive }) => lnk(isActive, '#00cfff')}>
          <LayoutDashboard size={14}/><span>Dashboard</span>
        </NavLink>
        <NavLink to="/cameras" style={({ isActive }) => lnk(isActive, '#00cfff')}>
          <Camera size={14}/><span>Camera Explorer</span>
        </NavLink>
        <NavLink to="/reports" style={({ isActive }) => lnk(isActive, '#00cfff')}>
          <FileText size={14}/><span>Reports</span>
        </NavLink>

        {/* Events — collapsible */}
        <div>
          <div onClick={() => setOpen(o => !o)} style={{ ...lnk(isEvt, '#ff6b6b'), justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <AlertTriangle size={14}/><span>Events & Alerts</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {unread > 0 && <span style={{ background:'#ff3b3b', color:'#fff', fontSize:8, fontWeight:'bold', padding:'1px 5px', borderRadius:2 }}>{unread}</span>}
              <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', color:'#2a4050' }}/>
            </div>
          </div>

          {open && (
            <div style={{ paddingLeft:10, borderLeft:'1px solid #0d1e2e', marginLeft:18, marginBottom:4 }}>
              <NavLink to="/events" style={({ isActive }) => ({ ...lnk(isActive, '#ff6b6b'), justifyContent:'space-between' })}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11 }}>🔔</span><span>All Alerts</span>
                </div>
                {unread > 0 && <span style={{ background:'#ff3b3b', color:'#fff', fontSize:8, fontWeight:'bold', padding:'1px 5px', borderRadius:2 }}>{unread}</span>}
              </NavLink>
              {USE_CASES.map(uc => (
                <NavLink key={uc.id} to={`/use-case/${uc.id}`} style={({ isActive }) => lnk(isActive, uc.color)}>
                  <span style={{ fontSize:11 }}>{uc.emoji}</span><span>{uc.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div style={{ padding:'10px 16px', borderTop:'1px solid #0d1e2e', display:'flex', alignItems:'center', gap:8 }}>
        <div className="live-dot" style={{ width:6, height:6, borderRadius:'50%', background:'#00ff88', color:'#00ff88' }}/>
        <span style={{ fontSize:9, color:'#2a4050', letterSpacing:2 }}>SYSTEM LIVE</span>
      </div>
    </aside>
  )
}
