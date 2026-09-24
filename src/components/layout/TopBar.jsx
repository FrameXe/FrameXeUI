import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/index.js'
import { LogOut, Sun, Moon, Cpu, Radio, Sparkles } from 'lucide-react'
import AiBrandHeader from '../brand/AiLogo.jsx'

export default function TopBar({ onToggleSidebar, isSidebarCollapsed }) {
  const [t, setT] = useState(new Date())
  const [showDropdown, setShowDropdown] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('vframe_theme') || 'light')
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  useEffect(() => {
    const iv = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('vframe_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <header className="topbar-premium" style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 16px',
      height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
      boxShadow: 'var(--shadow-sm)',
      zIndex: 100,
    }}>
      {/* Brand with AI Vision Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: 'none', padding: '4px 6px', borderRadius: 8,
            cursor: 'pointer', transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <AiBrandHeader isCollapsed={false} subtitle="NEURAL AI PLATFORM" />
        </button>

        {/* Live Stream Pulsing Pill */}
        <span className="ai-badge ai-badge-emerald live-badge-glow" style={{ padding: '3px 10px', fontSize: 10 }}>
          <span className="sonar-dot" style={{ width: 6, height: 6 }}>
            <span style={{ position: 'relative', zIndex: 1, width: 6, height: 6, borderRadius: '50%', background: 'var(--ai-emerald)', display: 'block' }} />
          </span>
          LIVE MATRIX
        </span>
      </div>

      {/* Right side controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="time-pill">
          {t.toLocaleTimeString()}
        </span>

        {/* Theme Switcher Button with colored icon */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
        >
          {theme === 'light' ? (
            <Moon size={13} style={{ color: '#8b5cf6' }} />
          ) : (
            <Sun size={13} style={{ color: '#f59e0b' }} />
          )}
          <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>



        {/* User avatar & dropdown */}
        {user && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>
                {user.username}
              </span>
              <span style={{ fontSize: 8.5, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user.label}
              </span>
            </div>
            
            <button 
              className="user-avatar"
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: '#fff',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(37,99,235,0.35)',
              }}
            >
              {user.username[0].toUpperCase()}
            </button>

            {showDropdown && (
              <div style={{
                position: 'absolute', right: 0, top: 38,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: 8, minWidth: 160,
                boxShadow: 'var(--shadow-md)', zIndex: 200,
                display: 'flex', flexDirection: 'column', gap: 4
              }}>
                <div style={{ padding: '6px 8px', fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Session Settings
                </div>
                <button
                  onClick={() => {
                    logout()
                    setShowDropdown(false)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', width: '100%', border: 'none',
                    borderRadius: 'var(--radius-sm)', background: 'transparent',
                    fontSize: 12, color: 'var(--red)', fontWeight: 600,
                    textAlign: 'left', cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--red-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}


