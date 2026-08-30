import { useState, useEffect } from 'react'
import { USE_CASES, UC_MAP } from '../constants/useCases.js'
import { reportAPI } from '../services/api.js'
import { useCameras } from '../hooks/useCameras.js'
import { Loading } from '../components/shared/index.jsx'
import { BarChart3, Download, RefreshCw, FileText } from 'lucide-react'
import { useAuthStore } from '../store/index.js'

export default function Reports() {
  const { cameras, loading: camsLoading } = useCameras()

  const [categorySel, setCategorySel] = useState('all')
  const [camSel, setCamSel] = useState('')
  const [ucSel, setUcSel]   = useState('people_count')
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
  const user = useAuthStore(s => s.user)
  const allowedUsecases = user?.allowedUsecases || []

  const CATEGORIES = [
    { id: 'all', label: '🌐 All Intelligence Suites' },
    { id: 'people', label: '👥 People & Crowd' },
    { id: 'vehicles', label: '🚗 Vehicle & Traffic' },
    { id: 'safety', label: '🚨 Security & Safety' },
  ]

  const matchesCategory = (ucId, cat) => {
    if (cat === 'all') return true
    if (cat === 'people') return ['people_count', 'crowd_alert'].includes(ucId)
    if (cat === 'vehicles') return ['traffic', 'vehicle_count', 'vehicle_speed'].includes(ucId)
    if (cat === 'safety') return ['intrusion', 'fire_detection'].includes(ucId)
    return true
  }

  const availableUsecases = USE_CASES.filter(
    u => (allowedUsecases.length === 0 || allowedUsecases.includes(u.id)) && matchesCategory(u.id, categorySel)
  )

  useEffect(() => { 
    if (cameras.length > 0) {
      const isAllowed = !camSel || cameras.some(c => c.id === camSel)
      if (!isAllowed) {
        setCamSel('')
        setRan(false)
        setData(null)
      }
    } else {
      setCamSel('')
      setRan(false)
      setData(null)
    }
  }, [cameras, camSel])

  useEffect(() => {
    if (availableUsecases.length > 0) {
      const isAllowed = availableUsecases.some(u => u.id === ucSel)
      if (!isAllowed || !ucSel) {
        setUcSel(availableUsecases[0].id)
        setRan(false)
        setData(null)
      }
    } else {
      setUcSel('')
      setRan(false)
      setData(null)
    }
  }, [categorySel, allowedUsecases])

  const generate = async () => {
    setBusy(true)
    try {
      const d = await reportAPI.get({
        ...(camSel ? { camera_id: camSel } : {}),
        usecase: ucSel,
        start_time: new Date(startDtm).toISOString(),
        end_time: new Date(endDtm).toISOString(),
      })
      setData(d); setRan(true)
    } finally { setBusy(false) }
  }

  const exportPdf = () => {
    if (!data?.timeline) return
    const camName = cameras.find(c => c.id === camSel)?.name || camSel || 'All Cameras'
    const ucLabel = uc?.label || ucSel
    const totalCount = data.summary?.total_count ?? 0
    const peakHour = data.summary?.peak_hour || 'N/A'
    const avgHour = data.summary?.avg_per_hour ?? data.summary?.average_per_hour ?? (totalCount ? (totalCount / 24).toFixed(2) : 0)

    const printWin = window.open('', '_blank')
    if (!printWin) return

    const hasInOut = data.summary?.total_in !== null && data.summary?.total_in !== undefined
    const totalIn = data.summary?.total_in ?? 0
    const totalOut = data.summary?.total_out ?? 0

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>FrameX Analytics Report - ${ucLabel}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 35px; color: #0f172a; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 14px; margin-bottom: 24px; }
          .logo { font-size: 20px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
          .badge { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 12px; }
          .meta-item { display: flex; flex-direction: column; }
          .meta-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-val { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
          .cards { display: grid; grid-template-columns: repeat(${hasInOut ? 5 : 3}, 1fr); gap: 14px; margin-bottom: 28px; }
          .card { border: 1px solid #cbd5e1; border-top: 4px solid #2563eb; border-radius: 8px; padding: 16px; text-align: center; background: #fff; }
          .card-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .card-val { font-size: 26px; font-weight: 800; color: #0f172a; margin-top: 6px; }
          .section-title { font-size: 14px; font-weight: 800; margin: 24px 0 12px; color: #0f172a; border-left: 4px solid #2563eb; padding-left: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; }
          td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 10px; color: #94a3b8; text-align: center; }
          @media print {
            body { margin: 0; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🎥 FRAME-X ANALYTICS REPORT</div>
          <div class="badge">OFFICIAL REPORT</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">Camera</span><span class="meta-val">${camName}</span></div>
          <div class="meta-item"><span class="meta-label">Intelligence Suite</span><span class="meta-val">${ucLabel}</span></div>
          <div class="meta-item"><span class="meta-label">Start Time</span><span class="meta-val">${startDtm}</span></div>
          <div class="meta-item"><span class="meta-label">End Time</span><span class="meta-val">${endDtm}</span></div>
        </div>

        <div class="cards">
          <div class="card" style="border-top-color: #2563eb;">
            <div class="card-title">Total Count</div>
            <div class="card-val">${totalCount}</div>
          </div>
          ${hasInOut ? `
          <div class="card" style="border-top-color: #16a34a;">
            <div class="card-title">Total IN</div>
            <div class="card-val" style="color: #16a34a;">${totalIn}</div>
          </div>
          <div class="card" style="border-top-color: #9333ea;">
            <div class="card-title">Total OUT</div>
            <div class="card-val" style="color: #9333ea;">${totalOut}</div>
          </div>
          ` : ''}
          <div class="card" style="border-top-color: #f59e0b;">
            <div class="card-title">Peak Hour</div>
            <div class="card-val">${peakHour}</div>
          </div>
          <div class="card" style="border-top-color: #3b82f6;">
            <div class="card-title">Avg / Hour</div>
            <div class="card-val">${avgHour}</div>
          </div>
        </div>

        <div class="section-title">Hourly Timeline Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Hour (Time)</th>
              ${hasInOut ? '<th>IN Count</th><th>OUT Count</th>' : ''}
              <th>Total Detections</th>
            </tr>
          </thead>
          <tbody>
            ${fullTimeline.map(t => `
              <tr>
                <td><strong>${t.time}</strong></td>
                ${hasInOut ? `<td>${t.count_in ?? '-'}</td><td>${t.count_out ?? '-'}</td>` : ''}
                <td><strong>${t.count}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Confidential & Proprietary Document • Generated by FrameX AI Video Analytics Engine • ${new Date().toLocaleString()}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
      </html>
    `

    printWin.document.write(htmlContent)
    printWin.document.close()
  }

  const exportCsv = () => {
    if (!data?.timeline) return
    const camName = cameras.find(c => c.id === camSel)?.name || camSel || 'All Cameras'
    const ucLabel = uc?.label || ucSel
    const hasInOut = data.summary?.total_in !== null && data.summary?.total_in !== undefined
    const headerLines = [
      'Report Summary',
      `Camera,"${camName}"`,
      `Use Case,"${ucLabel}"`,
      `Start Time,"${startDtm}"`,
      `End Time,"${endDtm}"`,
      `Total Count,${data.summary?.total_count ?? 0}`,
      ...(hasInOut ? [
        `Total IN,${data.summary?.total_in ?? 0}`,
        `Total OUT,${data.summary?.total_out ?? 0}`,
      ] : []),
      `Peak Hour,"${data.summary?.peak_hour ?? 'N/A'}"`,
      `Avg / Hour,${data.summary?.average_per_hour ?? 0}`,
      '',
      hasInOut ? 'Time,IN,OUT,Total' : 'Time,Count'
    ]
    const rows = data.timeline.map(t => 
      hasInOut 
        ? `${t.time},${t.count_in ?? 0},${t.count_out ?? 0},${t.count}`
        : `${t.time},${t.count}`
    )
    const blob = new Blob([[...headerLines, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${ucSel}_${camSel || 'all'}_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Build 24-hour timeline grid (00:00 to 23:00) so bars render at exact hourly slots
  const fullTimeline = Array.from({ length: 24 }, (_, h) => {
    const hourStr = `${h.toString().padStart(2, '0')}:00`
    const found = data?.timeline?.find(t => (t.time || t.hour) === hourStr)
    return {
      time: hourStr,
      hourNum: h,
      count: found ? found.count : 0
    }
  })

  const maxBar = Math.max(...fullTimeline.map(t => t.count), 1)

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
            label: 'Suite Category', content: (
              <select value={categorySel} onChange={e => { setCategorySel(e.target.value); setRan(false) }} style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '8px 14px', fontSize: 12, borderRadius: 'var(--radius-sm)', minWidth: 170, fontWeight: 600,
              }}>
                {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
              </select>
            )
          },
          {
            label: 'Camera', content: (
              <select value={camSel} onChange={e => { setCamSel(e.target.value); setRan(false) }} style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '8px 14px', fontSize: 12, borderRadius: 'var(--radius-sm)', minWidth: 140,
              }}>
                <option value="">All Cameras</option>
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
                {availableUsecases.map(u => (
                  <option key={u.id} value={u.id}>{u.emoji} {u.label}</option>
                ))}
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

        <button onClick={generate} disabled={busy} style={{
          background: busy ? 'var(--surface-2)' : '#2563eb', color: busy ? 'var(--text-3)' : '#fff',
          border: 'none', padding: '9px 22px', fontSize: 12, fontWeight: 600,
          borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: busy ? 'none' : '0 2px 8px rgba(37,99,235,0.3)',
        }}>
          <RefreshCw size={13} style={{ animation: busy ? 'spin 1s linear infinite' : 'none' }} />
          {busy ? 'Generating…' : 'Generate Report'}
        </button>

        {ran && data && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={exportPdf} style={{
              background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8',
              padding: '9px 18px', fontSize: 12, fontWeight: 600,
              borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 6,
              cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <FileText size={13} /> Export PDF
            </button>
            <button onClick={exportCsv} style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
              padding: '9px 18px', fontSize: 12, fontWeight: 600,
              borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 6,
              cursor: 'pointer',
            }}>
              <Download size={13} /> Export CSV
            </button>
          </div>
        )}
      </div>

      {busy && <Loading msg="Generating report…" />}

      {/* Results */}
      {ran && !busy && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hasInOut ? 5 : 3}, 1fr)`, gap: 14 }}>
            {[
              { label: 'Total Count', value: data.summary?.total_count ?? 0, color: uc?.color || '#2563eb' },
              ...(hasInOut ? [
                { label: 'Total IN',  value: data.summary?.total_in ?? 0, color: '#16a34a' },
                { label: 'Total OUT', value: data.summary?.total_out ?? 0, color: '#9333ea' },
              ] : []),
              { label: 'Peak Hour',   value: data.summary?.peak_hour || 'N/A', color: '#f59e0b' },
              { label: 'Avg / Hour',  value: data.summary?.avg_per_hour ?? data.summary?.average_per_hour ?? 0, color: '#3b82f6' },
            ].map((s, i) => (
              <div key={i} style={{
                background: '#fff', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '20px 22px',
                boxShadow: 'var(--shadow)', borderTop: `3px solid ${s.color}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>{s.label}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: s.color || 'var(--text)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={18} style={{ color: uc?.color || '#2563eb' }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>24-Hour Activity Timeline</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>
                Peak: <strong style={{ color: '#f59e0b' }}>{data.summary?.peak_hour || 'N/A'}</strong> | Total: <strong style={{ color: uc?.color || '#2563eb' }}>{data.summary?.total_count || 0}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 150, paddingBottom: 8, borderBottom: '1px solid var(--border-2)' }}>
              {fullTimeline.map((d, i) => {
                const pct = (d.count / maxBar) * 100
                const isPeak = d.time === data.summary?.peak_hour
                const barColor = isPeak ? '#f59e0b' : (uc?.color || '#2563eb')
                return (
                  <div 
                    key={i} 
                    title={`${d.time}: ${d.count} detections`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4, position: 'relative' }}
                  >
                    {d.count > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: barColor, marginBottom: 2 }}>
                        {d.count}
                      </span>
                    )}
                    <div style={{
                      width: '100%',
                      height: d.count > 0 ? `${Math.max(pct, 8)}%` : '3px',
                      background: d.count > 0 ? barColor : 'var(--surface-3, #e2e8f0)',
                      borderRadius: '4px 4px 0 0',
                      opacity: d.count > 0 ? 0.9 : 0.4,
                      transition: 'all 0.3s ease',
                      boxShadow: d.count > 0 ? `0 2px 8px ${barColor}40` : 'none',
                    }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10, fontWeight: 700, color: 'var(--text-3)' }}>
              <span>00:00</span>
              <span>03:00</span>
              <span>06:00</span>
              <span>09:00</span>
              <span>12:00</span>
              <span>15:00</span>
              <span>18:00</span>
              <span>21:00</span>
              <span>23:00</span>
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