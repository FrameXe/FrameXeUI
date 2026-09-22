import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Camera, AlertTriangle,
  SlidersHorizontal, BarChart3, Shield, Users, Radio, Building2, Car, Zap, Microscope,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { USE_CASES } from '../../constants/useCases.js'
import { useAllAlerts } from '../../hooks/useAlerts.js'
import { useCameras } from '../../hooks/useCameras.js'
import { useAuthStore } from '../../store/index.js'
import { subscribe, getLogs } from '../../lib/logCapture.js'
import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  { to: '/', end: true, icon: LayoutDashboard, label: 'Dashboard', permission: 'view_dashboard', color: '#38bdf8' },
  { to: '/cameras', icon: Camera, label: 'Video Matrix', permission: 'view_cameras', color: '#10b981' },
  { to: '/camera-management', icon: SlidersHorizontal, label: 'Configuration', permission: 'manage_cameras', color: '#06b6d4' },
  { to: '/agent-cameras', icon: Radio, label: 'Agent Cameras', permission: 'manage_cameras', color: '#6366f1' },
  { to: '/gpu-workers', icon: Zap, label: 'GPU Workers', permission: 'manage_cameras', color: '#8b5cf6' },
  { to: '/reports', icon: BarChart3, label: 'Intelligence Logs', permission: 'view_reports', color: '#f59e0b' },
  { to: '/user-management', icon: Users, label: 'User Directory', permission: 'manage_users', color: '#ec4899' },
  { to: '/tenant-management', icon: Building2, label: 'Tenant Manager', permission: 'manage_users', color: '#14b8a6' },
]

export default function Sidebar({ collapsed: externalCollapsed, setCollapsed: externalSetCollapsed }) {
  const { cameras } = useCameras()
  const { unread } = useAllAlerts(cameras)
  const user = useAuthStore(s => s.user)
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed
  const setCollapsed = externalSetCollapsed || setInternalCollapsed

  const [errorCount, setErrorCount] = useState(
    () => getLogs().filter(l => l.level === 'error' || l.level === 'runtime').length
  )

  useEffect(() => {
    const unsub = subscribe(logs => {
      setErrorCount(logs.filter(l => l.level === 'error' || l.level === 'runtime').length)
    })
    return unsub
  }, [])

  const showSuites = user?.permissions?.includes('view_cameras') ?? false
  const showMonitoring = user?.permissions?.includes('view_events') ?? false

  return (
    <aside className="sidebar-gradient sidebar-neon-edge" style={{
      width: collapsed ? 68 : 240,
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto',
      transition: 'width 0.22s ease-in-out',
      position: 'relative',
    }}>
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        style={{
          position: 'absolute', right: -12, top: 16,
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--surface)', border: '1px solid var(--border)',
          color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)', zIndex: 10, cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <nav style={{ padding: '8px 6px', flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

        {/* Global Navigation */}
        {!collapsed && (
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.08em', padding: '4px 8px 2px', textTransform: 'uppercase' }}>
            Operations Overview
          </div>
        )}
        {NAV_ITEMS.filter(item => !item.permission || user?.permissions.includes(item.permission)).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            style={({ isActive }) => ({
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderLeft: isActive ? `3px solid ${item.color}` : '3px solid transparent',
              background: isActive ? 'var(--surface-2)' : 'transparent',
            })}
          >
            <item.icon size={17} style={{ flexShrink: 0, color: item.color }} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Security & Alerts */}
        {showMonitoring && (
          <div style={{ marginTop: 6 }}>
            {!collapsed && (
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.08em', padding: '4px 8px 2px', textTransform: 'uppercase' }}>
                Active Monitoring
              </div>
            )}
            <NavLink
              to="/events"
              title={collapsed ? 'Safety Center' : undefined}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={({ isActive }) => ({
                justifyContent: collapsed ? 'center' : 'space-between',
                borderLeft: isActive ? '3px solid #ef4444' : '3px solid transparent',
                background: isActive ? 'var(--surface-2)' : 'transparent',
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Shield size={17} style={{ flexShrink: 0, color: '#ef4444' }} />
                {!collapsed && <span>Safety Center</span>}
              </div>
              {unread > 0 && (
                <span className="ai-badge ai-badge-rose" style={{ padding: '1px 6px', fontSize: 9, minWidth: 16, textAlign: 'center' }}>
                  {unread}
                </span>
              )}
            </NavLink>
            <NavLink
              to="/vehicle-log"
              title={collapsed ? 'Vehicle Log' : undefined}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={({ isActive }) => ({
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderLeft: isActive ? '3px solid #8b5cf6' : '3px solid transparent',
                background: isActive ? 'var(--surface-2)' : 'transparent',
              })}
            >
              <Car size={17} style={{ flexShrink: 0, color: '#8b5cf6' }} />
              {!collapsed && <span>Vehicle Log</span>}
            </NavLink>
          </div>
        )}

        {/* Intelligence Suites */}
        {showSuites && (
          <div style={{ marginTop: 6 }}>
            {!collapsed && (
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.08em', padding: '4px 8px 2px', textTransform: 'uppercase' }}>
                Intelligence Suites
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {USE_CASES.filter(uc => !user?.allowedUsecases || user.allowedUsecases.includes(uc.id)).map(uc => (
                <NavLink
                  key={uc.id}
                  to={`/use-case/${uc.id}`}
                  title={collapsed ? uc.label : undefined}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  style={({ isActive }) => ({
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderLeft: isActive ? `3px solid ${uc.color}` : '3px solid transparent',
                    background: isActive ? 'var(--surface-2)' : 'transparent',
                  })}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: uc.color,
                    boxShadow: `0 0 5px ${uc.color}`,
                    flexShrink: 0,
                    marginRight: collapsed ? 0 : 2
                  }} />
                  {!collapsed && <span>{uc.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div style={{ padding: '6px 8px', borderTop: '1px solid var(--border)' }}>
        <NavLink
          to="/diagnostics"
          title={collapsed ? 'Diagnostics' : undefined}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          style={{ justifyContent: collapsed ? 'center' : 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Microscope size={17} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Diagnostics</span>}
          </div>
          {errorCount > 0 && (
            <span style={{
              background: 'var(--red)', color: '#fff', fontSize: 9, fontWeight: 800,
              padding: '1px 6px', borderRadius: 20, minWidth: 16, textAlign: 'center',
            }}>{errorCount}</span>
          )}
        </NavLink>
      </div>

      <div style={{
        padding: collapsed ? '8px 0' : '8px 12px',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 8
      }}>
        <div className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
        {!collapsed && <div style={{ fontSize: 10.5, color: 'var(--text-2)', fontWeight: 700 }}>System Online</div>}
      </div>
    </aside>
  )
}