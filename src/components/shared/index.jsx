// Shared UI primitives — enterprise white theme

export function KpiCard({ title, value, color = '#2563eb', icon: Icon, sub, trend }) {
  return (
    <div className="card-hover" style={{
      background: '#fff', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '20px 22px',
      boxShadow: 'var(--shadow)', borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
            {title}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>{sub}</div>}
        </div>
        {Icon && (
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} style={{ color }} />
          </div>
        )}
      </div>
    </div>
  )
}

export function Loading({ msg = 'Loading…' }) {
  return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{msg}</div>
    </div>
  )
}

export function Empty({ msg = 'No data' }) {
  return (
    <div style={{ padding: 48, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface-2)' }}>
      <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{msg}</div>
    </div>
  )
}

export function Btn({ children, onClick, active = false, color = '#2563eb', style: sx }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `${color}12` : 'var(--surface-2)',
      border: `1px solid ${active ? color + '44' : 'var(--border)'}`,
      color: active ? color : 'var(--text-2)',
      padding: '6px 14px', fontSize: 12, fontWeight: 500,
      borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.15s',
      ...sx,
    }}>{children}</button>
  )
}

export function Tag({ children, color }) {
  return (
    <span style={{
      fontSize: 11, background: `${color}12`, border: `1px solid ${color}33`,
      color, padding: '3px 10px', borderRadius: 12, fontWeight: 600,
    }}>
      {children}
    </span>
  )
}

export const SEV_COLOR = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#16a34a',
}

export const SEV_STYLE = {
  critical: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  high:     { bg: '#fff7ed', border: '#fed7aa', color: '#ea580c' },
  medium:   { bg: '#fefce8', border: '#fde68a', color: '#ca8a04' },
  low:      { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
}
