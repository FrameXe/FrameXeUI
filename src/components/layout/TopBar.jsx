import { useState, useEffect } from 'react'
import { USE_MOCK } from '../../config/index.js'
import { useAuthStore } from '../../store/index.js'
import { LogOut } from 'lucide-react'

export default function TopBar() {
  const [t, setT] = useState(new Date())
  const [showDropdown, setShowDropdown] = useState(false)
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  useEffect(() => { const iv = setInterval(() => setT(new Date()), 1000); return () => clearInterval(iv) }, [])

  return (
    <header style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 28px',
      height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
      boxShadow: 'var(--shadow-sm)',
      zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo mark */}
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
          }}>
            <span style={{ fontSize: 16 }}>🎯</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              vFrameXe
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.05em' }}>
              AI Video Analytics
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />

        <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
          ACME Corporation
        </div>

        <span style={{
          fontSize: 10, fontWeight: 600,
          background: USE_MOCK ? 'var(--yellow-bg)' : 'var(--green-bg)',
          border: `1px solid ${USE_MOCK ? '#fde68a' : '#bbf7d0'}`,
          color: USE_MOCK ? 'var(--yellow)' : 'var(--green)',
          padding: '3px 10px', borderRadius: 20, letterSpacing: '0.04em',
        }}>
          {USE_MOCK ? '⚡ DEMO' : '🟢 LIVE'}
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          {t.toLocaleTimeString()}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="live-dot" style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--green)', color: 'var(--green)',
          }} />
          <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, letterSpacing: '0.04em' }}>
            System Online
          </span>
        </div>
        
        {/* User avatar & dropdown */}
        {user && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                {user.username}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user.label}
              </span>
            </div>
            
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
                border: 'none', cursor: 'pointer'
              }}
            >
              {user.username[0].toUpperCase()}
            </button>

            {showDropdown && (
              <div style={{
                position: 'absolute', right: 0, top: 40,
                background: '#fff', border: '1px solid var(--border)',
                borderRadius: 10, padding: 8, minWidth: 150,
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
                    borderRadius: 6, background: 'transparent',
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

