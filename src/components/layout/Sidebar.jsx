import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Camera, AlertTriangle,
  SlidersHorizontal, BarChart3, Shield, Users
} from 'lucide-react'
import { USE_CASES } from '../../constants/useCases.js'
import { useAllAlerts } from '../../hooks/useAlerts.js'
import { useCameras } from '../../hooks/useCameras.js'
import { useAuthStore } from '../../store/index.js'

const NAV_ITEMS = [
  { to: '/', end: true,            icon: LayoutDashboard, label: 'Dashboard', permission: 'view_dashboard' },
  { to: '/cameras',                icon: Camera,           label: 'Video Matrix', permission: 'view_cameras' },
  { to: '/camera-management',      icon: SlidersHorizontal,label: 'Configuration', permission: 'manage_cameras' },
  { to: '/reports',                icon: BarChart3,        label: 'Intelligence Logs', permission: 'view_reports' },
  { to: '/user-management',        icon: Users,            label: 'User Directory', permission: 'manage_users' },
]

export default function Sidebar() {
  const { cameras } = useCameras()
  const { unread } = useAllAlerts(cameras)
  const user = useAuthStore(s => s.user)

  const showSuites = user?.permissions.includes('view_cameras')

  return (
    <aside style={{
      width: 240, background: '#fff', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto',
    }}>
      <nav style={{ padding: '12px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Global Navigation */}
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.12em', padding: '12px 10px 8px', textTransform: 'uppercase' }}>
          Operations Overview
        </div>
        {NAV_ITEMS.filter(item => !item.permission || user?.permissions.includes(item.permission)).map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <item.icon size={16} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Security & Alerts */}
        {user?.permissions.includes('view_events') && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.12em', padding: '12px 10px 8px', textTransform: 'uppercase' }}>
              Active Monitoring
            </div>
            <NavLink to="/events" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={16} />
                <span>Safety Center</span>
              </div>
              {unread > 0 && (
                <span style={{
                  background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, 
                  padding: '2px 8px', borderRadius: 20, minWidth: 20, textAlign: 'center'
                }}>{unread}</span>
              )}
            </NavLink>
          </div>
        )}

        {/* Intelligence Suites - FLAT LIST */}
        {showSuites && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.12em', padding: '12px 10px 8px', textTransform: 'uppercase' }}>
              Intelligence Suites
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {USE_CASES.filter(uc => !user?.allowedUsecases || user.allowedUsecases.includes(uc.id)).map(uc => (
                <NavLink 
                  key={uc.id} 
                  to={`/use-case/${uc.id}`} 
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  <span style={{ fontSize: 16 }}>{uc.emoji}</span>
                  <span>{uc.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
        <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700 }}>AI Vision Online</div>
      </div>
    </aside>
  )
}