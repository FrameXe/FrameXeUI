import { useState, useEffect } from 'react'
import { USE_CASES, UC_MAP } from '../constants/useCases.js'
import { reportAPI } from '../services/api.js'
import { useCameras } from '../hooks/useCameras.js'
import { Loading } from '../components/shared/index.jsx'
import { BarChart3, Download, RefreshCw } from 'lucide-react'

export default function Reports() {
  const { cameras, loading: camsLoading } = useCameras()

  const [camSel, setCamSel] = useState('')
  const [ucSel, setUcSel]   = useState('people_counting')
  const [startDtm, setStartDtm] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 16)
  })
  const [endDtm, setEndDtm] = useState(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d.toISOString().slice(0, 16)
  })
  const [data, setData]   = useState(null)
  const [busy, setBusy]   = useState(false)
  const [ran, setRan]     = useState(false)
  const uc = UC_MAP[ucSel]

  useEffect(() => { if (cameras.length > 0 && !camSel) setCamSel(cameras[0].id) }, [cameras, camSel])

  const generate = async () => {
    if (!camSel) return
    setBusy(true)
    try {
      const d = await reportAPI.get({
        camera_id: camSel, usecase: ucSel,
        start_time: new Date(startDtm).toISOString(),
        end_time: new Date(endDtm).toISOString(),
      })
      setData(d); setRan(true)
    } finally { setBusy(false) }
  }

  const exportCsv = () => {
    if (!data?.timeline) return
    const rows = data.timeline.map(t => `${t.time},${t.count}`)
    const blob = new Blob([['Time,Count', ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `report_${ucSel}_${camSel}_${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const maxBar = data?.timeline ? Math.max(...data.timeline.map(t => t.count), 1) : 1

  if (camsLoading) return <Loading msg="Loading…" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Reports
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
          Generate and export analytical insights per camera and use case
        </p>
      </div>

      {/* Controls */}
      <div style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: '20px 24px', boxShadow: 'var(--shadow)',
        display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap',
      }}>
        {[
          {
            label: 'Camera', content: (
              <select value={camSel} onChange={e => { setCamSel(e.target.value); setRan(false) }} style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '8px 14px', fontSize: 12, borderRadius: 'var(--radius-sm)', minWidth: 140,
              }}>
                {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )
          },
          {
            label: 'Use Case', content: (
              <select value={ucSel} onChange={e => { setUcSel(e.target.value); setRan(false) }} style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '8px 14px', fontSize: 12, borderRadius: 'var(--radius-sm)', minWidth: 160,
              }}>
                {USE_CASES.map(u => <option key={u.id} value={u.id}>{u.emoji} {u.label}</option>)}
              </select>
            )
          },
          {
            label: 'Start Time', content: (
              <input type="datetime-local" value={startDtm} onChange={e => { setStartDtm(e.target.value); setRan(false) }} style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '8px 14px', fontSize: 12, borderRadius: 'var(--radius-sm)',
              }} />
            )
          },
          {
            label: 'End Time', content: (
              <input type="datetime-local" value={endDtm} onChange={e => { setEndDtm(e.target.value); setRan(false) }} style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '8px 14px', fontSize: 12, borderRadius: 'var(--radius-sm)',
              }} />
            )
          },
        ].map(({ label, content }, i) => (
          <div key={i}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
              {label}
            </label>
            {content}
          </div>
        ))}

        <button onClick={generate} disabled={busy || !camSel} style={{
          background: busy ? 'var(--surface-2)' : '#2563eb', color: busy ? 'var(--text-3)' : '#fff',
          border: 'none', padding: '9px 22px', fontSize: 12, fontWeight: 600,
          borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: busy ? 'none' : '0 2px 8px rgba(37,99,235,0.3)',
        }}>
          <RefreshCw size={13} style={{ animation: busy ? 'spin 1s linear infinite' : 'none' }} />
          {busy ? 'Generating…' : 'Generate Report'}
        </button>

        {ran && data && (
          <button onClick={exportCsv} style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
            padding: '9px 18px', fontSize: 12, fontWeight: 600,
            borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Download size={13} /> Export CSV
          </button>
        )}
      </div>

      {busy && <Loading msg="Generating report…" />}

      {/* Results */}
      {ran && !busy && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Total Count', value: data.summary?.total_count, color: uc?.color || '#2563eb' },
              { label: 'Peak Hour',   value: data.summary?.peak_hour,   color: '#f59e0b' },
              { label: 'Avg / Hour',  value: data.summary?.average_per_hour, color: '#3b82f6' },
            ].map((s, i) => (
              <div key={i} style={{
                background: '#fff', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '20px 22px',
                boxShadow: 'var(--shadow)', borderTop: `3px solid ${s.color}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>{s.label}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <BarChart3 size={16} style={{ color: uc?.color || '#2563eb' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Hourly Timeline</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
              {data.timeline?.map((d, i) => {
                const pct = (d.count / maxBar) * 100
                return (
                  <div key={i} title={`${d.time || d.hour}: ${d.count}`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                  >
                    <div style={{
                      width: '100%', minWidth: 4,
                      height: `${Math.max(pct, 4)}%`,
                      background: uc?.color || '#2563eb',
                      borderRadius: '3px 3px 0 0',
                      opacity: 0.75,
                      transition: 'height 0.4s ease',
                    }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--text-3)' }}>
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
            </div>
          </div>

          {/* Timeline table */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Timeline Data</span>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Time</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.timeline?.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-2)', background: i % 2 === 0 ? '#fff' : 'var(--surface-2)' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--text-2)', fontWeight: 500 }}>{d.time || d.hour}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: uc?.color || '#2563eb' }}>{d.count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}