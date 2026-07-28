import { useEffect, useState, useRef } from 'react'
import { subscribe, clearLogs } from '../lib/logCapture.js'
import { Trash2, Copy, Check, Activity, AlertTriangle, Info, Wifi, WifiOff, ChevronDown, ChevronUp } from 'lucide-react'

const LEVEL_CONFIG = {
  error:  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  label: 'ERROR',  icon: '✖' },
  warn:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'WARN',   icon: '⚠' },
  info:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: 'INFO',   icon: 'ℹ' },
  log:    { color: '#64748b', bg: 'rgba(100,116,139,0.05)', label: 'LOG',  icon: '›' },
  webrtc: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', label: 'WEBRTC', icon: '⚡' },
  system: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', label: 'SYSTEM', icon: '●' },
  runtime:{ color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'RUNTIME', icon: '💥' },
}

export default function DiagnosticPanel() {
  const [logs, setLogs]         = useState([])
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [copied, setCopied]     = useState(false)
  const [paused, setPaused]     = useState(false)
  const [expanded, setExpanded] = useState({})
  const bottomRef               = useRef(null)
  const pausedRef               = useRef(false)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const unsub = subscribe((newLogs) => {
      if (!pausedRef.current) setLogs(newLogs)
    })
    return unsub
  }, [])

  const filtered = logs.filter(l => {
    if (filter !== 'all' && l.level !== filter) return false
    if (search && !l.message.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const errorCount  = logs.filter(l => l.level === 'error' || l.level === 'runtime').length
  const warnCount   = logs.filter(l => l.level === 'warn').length
  const webrtcCount = logs.filter(l => l.level === 'webrtc').length

  const handleCopy = () => {
    const text = filtered.map(l =>
      `[${l.time}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`
    ).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const FILTERS = [
    { key: 'all',    label: 'All',     count: logs.length },
    { key: 'error',  label: 'Errors',  count: errorCount },
    { key: 'warn',   label: 'Warns',   count: warnCount },
    { key: 'webrtc', label: 'WebRTC',  count: webrtcCount },
    { key: 'log',    label: 'Log',     count: logs.filter(l => l.level === 'log').length },
    { key: 'info',   label: 'Info',    count: logs.filter(l => l.level === 'info').length },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            🔬 Diagnostic Logs
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
            Live console capture — WebRTC, API, UI errors in real-time
          </p>
        </div>

        {/* Stats badges */}
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: errorCount > 0 ? '#fef2f2' : '#f8fafc', color: errorCount > 0 ? '#ef4444' : '#94a3b8', border: `1px solid ${errorCount > 0 ? '#fecaca' : '#e2e8f0'}` }}>
            ✖ {errorCount} Errors
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: warnCount > 0 ? '#fffbeb' : '#f8fafc', color: warnCount > 0 ? '#f59e0b' : '#94a3b8', border: `1px solid ${warnCount > 0 ? '#fde68a' : '#e2e8f0'}` }}>
            ⚠ {warnCount} Warns
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #ddd6fe' }}>
            ⚡ {webrtcCount} WebRTC
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '12px 16px', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${filter === f.key ? 'var(--primary)' : 'var(--border)'}`,
                background: filter === f.key ? 'var(--primary)' : '#fff',
                color: filter === f.key ? '#fff' : 'var(--text-3)',
                transition: 'all 0.15s',
              }}
            >
              {f.label} {f.count > 0 && <span style={{ opacity: 0.8 }}>({f.count})</span>}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)',
            background: '#f8fafc', color: 'var(--text)', outline: 'none', width: 180,
          }}
        />

        {/* Pause */}
        <button
          onClick={() => setPaused(p => !p)}
          title={paused ? 'Resume log capture' : 'Pause log capture'}
          style={{
            padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
            border: `1px solid ${paused ? '#f59e0b' : 'var(--border)'}`,
            background: paused ? '#fffbeb' : '#fff',
            color: paused ? '#f59e0b' : 'var(--text-3)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {paused ? <><WifiOff size={12} /> Paused</> : <><Wifi size={12} /> Live</>}
        </button>

        {/* Copy */}
        <button
          onClick={handleCopy}
          style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border)', background: '#fff', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          {copied ? <><Check size={12} color="#10b981" /> Copied!</> : <><Copy size={12} /> Copy All</>}
        </button>

        {/* Clear */}
        <button
          onClick={clearLogs}
          style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {/* Log list */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3,
        background: '#0f172a', borderRadius: 'var(--radius)', padding: 12,
        fontFamily: "'Courier New', monospace", fontSize: 12, minHeight: 0,
      }}>
        {filtered.length === 0 ? (
          <div style={{ color: '#334155', textAlign: 'center', padding: 48, fontSize: 13 }}>
            <Activity size={32} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            No logs yet. Actions will appear here in real-time.
          </div>
        ) : (
          filtered.map(log => {
            const cfg = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.log
            const isLong = log.message.length > 200
            const isExpanded = expanded[log.id]
            const displayMsg = isLong && !isExpanded ? log.message.slice(0, 200) + '…' : log.message

            return (
              <div
                key={log.id}
                style={{
                  display: 'flex', gap: 8, padding: '6px 10px', borderRadius: 6,
                  background: cfg.bg, borderLeft: `3px solid ${cfg.color}`,
                  alignItems: 'flex-start',
                }}
              >
                {/* Time */}
                <span style={{ color: '#475569', flexShrink: 0, fontSize: 10, paddingTop: 1 }}>
                  {log.time}
                </span>

                {/* Level badge */}
                <span style={{
                  background: cfg.color, color: '#fff', fontSize: 9, fontWeight: 800,
                  padding: '1px 6px', borderRadius: 3, flexShrink: 0, letterSpacing: '0.05em',
                  alignSelf: 'flex-start', marginTop: 1,
                }}>
                  {cfg.label}
                </span>

                {/* Source */}
                <span style={{ color: '#64748b', fontSize: 10, flexShrink: 0, paddingTop: 1 }}>
                  [{log.source}]
                </span>

                {/* Message */}
                <span style={{ color: cfg.color === '#64748b' ? '#94a3b8' : cfg.color, wordBreak: 'break-all', flex: 1, lineHeight: 1.5 }}>
                  {displayMsg}
                  {isLong && (
                    <button
                      onClick={() => toggleExpand(log.id)}
                      style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 10, marginLeft: 6, padding: 0 }}
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>
        Showing {filtered.length} of {logs.length} total entries · Max 500 retained
      </div>
    </div>
  )
}
