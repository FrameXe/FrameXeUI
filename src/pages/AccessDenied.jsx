import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export default function AccessDenied() {
  const navigate = useNavigate()

  return (
    <div style={{
      height: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 24,
      padding: 24,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'var(--red-bg)', color: 'var(--red)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow)',
        marginBottom: 8
      }}>
        <ShieldAlert size={40} />
      </div>
      
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          Access Denied
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500, maxWidth: 450, margin: '0 auto', lineHeight: 1.5 }}>
          Your account role does not have the required security clearances to view this operations module. Please contact your administrator if this is an error.
        </p>
      </div>

      <button
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 24px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          color: 'var(--text-2)',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.15s'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--surface-2)'
          e.currentTarget.style.transform = 'translateX(-2px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--surface)'
          e.currentTarget.style.transform = 'none'
        }}
      >
        <ArrowLeft size={16} />
        <span>Return to Dashboard</span>
      </button>
    </div>
  )
}
