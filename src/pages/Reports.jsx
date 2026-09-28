import { useState, useEffect } from 'react'
import { USE_CASES, UC_MAP } from '../constants/useCases.js'
import { reportAPI, vehicleDetectionAPI } from '../services/api.js'
import { useCameras } from '../hooks/useCameras.js'
import { Loading } from '../components/shared/index.jsx'
import { BarChart3, Download, RefreshCw, FileText, X } from 'lucide-react'
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
  const [data, setData]         = useState(null)
  const [busy, setBusy]         = useState(false)
  const [ran, setRan]           = useState(false)
  // ANPR / Vehicle Detection specific state
  const [anprDetections, setAnprDetections] = useState([])
  const [anprTotal, setAnprTotal]           = useState(0)
  const [anprPage, setAnprPage]             = useState(1)
  const [anprPageSize, setAnprPageSize]     = useState(25)
  const [lightboxItem, setLightboxItem]     = useState(null)
  const [toast, setToast]                   = useState(null) // { msg, type: 'info'|'success'|'error' }
  const [exportBusy, setExportBusy]         = useState(false)
  const uc = UC_MAP[ucSel]
  const user = useAuthStore(s => s.user)
  const allowedUsecases = user?.allowedUsecases || []
  const isVehicleDetection = ucSel === 'vehicle_detection' || ucSel === 'traffic'

  const CATEGORIES = [
    { id: 'all', label: '🌐 All Intelligence Suites' },
    { id: 'people', label: '👥 People & Crowd' },
    { id: 'vehicles', label: '🚗 Vehicle & Traffic' },
    { id: 'safety', label: '🚨 Security & Safety' },
  ]

  const matchesCategory = (ucId, cat) => {
    if (cat === 'all') return true
    if (cat === 'people') return ['people_count', 'crowd_alert'].includes(ucId)
    if (cat === 'vehicles') return ['traffic', 'vehicle_count', 'vehicle_speed', 'vehicle_detection'].includes(ucId)
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

  // Auto-dismiss success/error toasts after 4s
  useEffect(() => {
    if (toast?.type !== 'info') {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const generate = async () => {
    setBusy(true)
    setRan(false)
    setData(null)
    setAnprDetections([])
    setToast({ msg: '⏳ Report generation in progress…', type: 'info' })

    try {
      if (isVehicleDetection) {
        // Call the existing vehicleDetectionAPI.list() — same function VehicleLog uses
        // No new endpoint needed, GET /api/vehicle-detections handles everything
        const res = await vehicleDetectionAPI.list({
          ...(camSel ? { camera_id: camSel } : {}),
          start_time: new Date(startDtm).toISOString(),
          end_time: new Date(endDtm).toISOString(),
          page: anprPage,
          page_size: anprPageSize,
        })
        setAnprDetections(res.detections || [])
        setAnprTotal(res.total || 0)
        setRan(true)
        setToast({ msg: `✅ Report ready — ${res.total} records found`, type: 'success' })
      } else {
        const d = await reportAPI.get({
          ...(camSel ? { camera_id: camSel } : {}),
          usecase: ucSel,
          start_time: new Date(startDtm).toISOString(),
          end_time: new Date(endDtm).toISOString(),
        })
        setData(d)
        setRan(true)
        setToast({ msg: '✅ Report ready', type: 'success' })
      }
    } catch (err) {
      setToast({ msg: '❌ Report generation failed. Please try again.', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  // ── ANPR pagination handler ───────────────────────────────────────────
  const handleAnprPageChange = async (newPage) => {
    setAnprPage(newPage)
    setBusy(true)
    setToast({ msg: `⏳ Loading page ${newPage}…`, type: 'info' })
    try {
      const res = await vehicleDetectionAPI.list({
        ...(camSel ? { camera_id: camSel } : {}),
        start_time: new Date(startDtm).toISOString(),
        end_time: new Date(endDtm).toISOString(),
        page: newPage,
        page_size: anprPageSize,
      })
      setAnprDetections(res.detections || [])
      setAnprTotal(res.total || 0)
      setToast({ msg: `✅ Page ${newPage} loaded`, type: 'success' })
    } catch {
      setToast({ msg: '❌ Failed to load page.', type: 'error' })
    } finally {
      setBusy(false)
    }
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

  // ── Helper: fetch ALL records across all pages for export ────
  const fetchAllForExport = async () => {
    if (anprTotal === 0) return anprDetections
    // If we already have all records on screen, no need to re-fetch
    if (anprDetections.length >= anprTotal) return anprDetections
    const res = await vehicleDetectionAPI.list({
      ...(camSel ? { camera_id: camSel } : {}),
      start_time: new Date(startDtm).toISOString(),
      end_time: new Date(endDtm).toISOString(),
      page: 1,
      page_size: anprTotal, // fetch everything in one shot
    })
    return res.detections || []
  }

  // ── ANPR CSV export — fetches ALL records ────────────────────
  const exportAnprCsv = async () => {
    if (!anprDetections.length) return
    setExportBusy(true)
    setToast({ msg: '⏳ Preparing CSV export — fetching all records…', type: 'info' })
    try {
      const allRecords = await fetchAllForExport()
      const camName = cameras.find(c => c.id === camSel)?.name || camSel || 'All Cameras'
      const ucLabel = uc?.label
      const header = [
        `${ucLabel} Report`,
        `Camera,"${camName}"`,
        `Period,"${startDtm} → ${endDtm}"`,
        `Total Records,${allRecords.length}`,
        '',
        'S.No.,Capture Time,Vehicle Type,Plate Status,Camera ID,Track ID,Direction,Object ID',
      ]
      const rows = allRecords.map((d, i) => [
        i + 1,
        `"${new Date(d.timestamp).toLocaleString()}"`,
        d.vehicleType || 'unknown',
        `"${d.plateNumber || 'No Plate Detected'}"`,
        `"${d.cameraId}"`,
        d.trackId ?? '',
        d.direction || '',
        `"${d.id}"`,
      ].join(','))
      const blob = new Blob([[...header, ...rows].join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${ucSel}_report_${camSel || 'all'}_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setToast({ msg: `✅ CSV exported — ${allRecords.length} records`, type: 'success' })
    } catch {
      setToast({ msg: '❌ Export failed. Please try again.', type: 'error' })
    } finally {
      setExportBusy(false)
    }
  }

  // ── ANPR PDF export — fetches ALL records, includes Full Frame image ──
  const exportAnprPdf = async () => {
    if (!anprDetections.length) return
    setExportBusy(true)
    setToast({ msg: '⏳ Preparing PDF export — fetching all records…', type: 'info' })
    try {
      const allRecords = await fetchAllForExport()
      const camName = cameras.find(c => c.id === camSel)?.name || camSel || 'All Cameras'
      const ucLabel = uc?.label || ucSel || 'Vehicle Detection Report'
      const rowsHtml = allRecords.map((d, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${new Date(d.timestamp).toLocaleString()}</td>
          <td style="padding:6px">
            ${d.imageUrl
              ? `<img src="${d.imageUrl}" style="width:90px;height:56px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0" />`
              : '<span style="color:#94a3b8;font-size:10px">No frame</span>'}
          </td>
          <td style="padding:6px">
            ${d.plateCropUrl
              ? `<img src="${d.plateCropUrl}" style="width:80px;height:40px;object-fit:contain;border-radius:4px;border:1px solid #e2e8f0;background:#000" />`
              : '<span style="color:#94a3b8;font-size:10px">No crop</span>'}
          </td>
          <td style="text-transform:capitalize">${d.vehicleType || 'unknown'}</td>
          <td>${d.plateNumber || 'No Plate Detected'}</td>
          <td style="font-size:10px">${d.cameraId}</td>
          <td>#${d.trackId ?? 'N/A'}</td>
          <td style="text-transform:capitalize">${d.direction || 'N/A'}</td>
          <td style="font-size:10px;color:#64748b">…${d.id.slice(-8)}</td>
        </tr>
      `).join('')
      const printWin = window.open('', '_blank')
      if (!printWin) return
      const html = `<!DOCTYPE html><html><head>
        <title>${ucLabel} Report — ${camName}</title>
        <style>
          body{font-family:'Segoe UI',Arial,sans-serif;margin:35px;color:#0f172a;background:#fff}
          .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #4f6df5;padding-bottom:14px;margin-bottom:24px}
          .logo{font-size:18px;font-weight:800;color:#4f6df5}
          .badge{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase}
          .meta{background:#f8fafc;border:1px solid #e2e8f0;padding:14px 18px;border-radius:8px;margin-bottom:24px;font-size:12px;display:flex;gap:32px}
          .meta-item{display:flex;flex-direction:column}
          .meta-label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px}
          .meta-val{font-size:13px;font-weight:700;color:#0f172a;margin-top:2px}
          table{width:100%;border-collapse:collapse;font-size:11px}
          th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#475569;border-bottom:2px solid #cbd5e1;text-transform:uppercase;white-space:nowrap}
          td{padding:9px 12px;border-bottom:1px solid #e2e8f0;vertical-align:middle}
          tr:nth-child(even){background:#f8fafc}
          .footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:14px;font-size:10px;color:#94a3b8;text-align:center}
          @media print{body{margin:0}@page{margin:1.5cm;size:A4 landscape}}
        </style>
      </head><body>
        <div class="header">
          <div class="logo">🎥 FRAME-X · ${ucLabel.toUpperCase()} REPORT</div>
          <div class="badge">OFFICIAL REPORT</div>
        </div>
        <div class="meta">
          <div class="meta-item"><span class="meta-label">Camera</span><span class="meta-val">${camName}</span></div>
          <div class="meta-item"><span class="meta-label">Period</span><span class="meta-val">${startDtm} → ${endDtm}</span></div>
          <div class="meta-item"><span class="meta-label">Total Records</span><span class="meta-val">${allRecords.length}</span></div>
        </div>
        <table>
          <thead><tr>
            <th>S.No.</th><th>Capture Time</th><th>Full Frame</th><th>Plate Crop</th>
            <th>Vehicle Type</th><th>Plate Status</th><th>Camera ID</th>
            <th>Track ID</th><th>Direction</th><th>Object ID</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="footer">Confidential &amp; Proprietary • Generated by FrameX AI Video Analytics Engine • ${new Date().toLocaleString()}</div>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 800); }<\/script>
      </body></html>`
      printWin.document.write(html)
      printWin.document.close()
      setToast({ msg: `✅ PDF ready — ${allRecords.length} records`, type: 'success' })
    } catch {
      setToast({ msg: '❌ PDF export failed. Please try again.', type: 'error' })
    } finally {
      setExportBusy(false)
    }
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
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
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

        {ran && (data || anprDetections.length > 0) && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={isVehicleDetection ? exportAnprPdf : exportPdf}
              disabled={exportBusy}
              style={{
                background: exportBusy ? 'var(--surface-2)' : 'var(--accent-bg)',
                border: '1px solid var(--border)', color: exportBusy ? 'var(--text-3)' : 'var(--accent)',
                padding: '9px 18px', fontSize: 12, fontWeight: 600,
                borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 6,
                cursor: exportBusy ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-sm)',
              }}
            >
              <FileText size={13} /> {exportBusy ? 'Preparing…' : 'Export PDF'}
            </button>
            <button
              onClick={isVehicleDetection ? exportAnprCsv : exportCsv}
              disabled={exportBusy}
              style={{
                background: exportBusy ? 'var(--surface-2)' : 'var(--green-bg)',
                border: '1px solid var(--border)', color: exportBusy ? 'var(--text-3)' : 'var(--green)',
                padding: '9px 18px', fontSize: 12, fontWeight: 600,
                borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 6,
                cursor: exportBusy ? 'not-allowed' : 'pointer',
              }}
            >
              <Download size={13} /> {exportBusy ? 'Preparing…' : 'Export CSV'}
            </button>
          </div>
        )}
      </div>

      {busy && <Loading msg="Generating report…" />}

      {/* Results */}
      {ran && !busy && !isVehicleDetection && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { 
                label: 'Total Count', 
                value: data.summary?.total_count ?? 0, 
                color: uc?.color || '#2563eb',
                sub: (data.summary?.total_in !== undefined && data.summary?.total_in !== null) 
                  ? `IN: ${data.summary.total_in} • OUT: ${data.summary.total_out ?? 0}` 
                  : null
              },
              { label: 'Peak Hour',   value: data.summary?.peak_hour || 'N/A', color: '#f59e0b', sub: null },
              { label: 'Avg / Hour',  value: data.summary?.avg_per_hour ?? data.summary?.average_per_hour ?? 0, color: '#3b82f6', sub: null },
            ].map((s, i) => (
              <div key={i} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '20px 22px',
                boxShadow: 'var(--shadow)', borderTop: `3px solid ${s.color}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
                {s.sub && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginTop: 4 }}>
                    {s.sub}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow)' }}>

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
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
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
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-2)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
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

      {/* ── ANPR / Vehicle Detection table ──────────────────────────────── */}
      {isVehicleDetection && ran && !busy && anprDetections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Summary strip + page-size selector */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '16px 24px',
            display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap',
            boxShadow: 'var(--shadow)',
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total Records</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#4f6df5', marginTop: 2 }}>{anprTotal}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Showing</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{anprDetections.length} records</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>Rows per page:</span>
              {[10, 25, 50].map(size => (
                <button key={size} onClick={() => setAnprPageSize(size)}
                  style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    border: '1px solid var(--border)', cursor: 'pointer',
                    background: anprPageSize === size ? '#4f6df5' : 'var(--surface-2)',
                    color: anprPageSize === size ? '#fff' : 'var(--text)',
                  }}
                >{size}</button>
              ))}
            </div>
          </div>

          {/* Detection table */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    {['S.No.', 'Capture Time', 'Plate Thumb', 'Vehicle Type', 'Plate Status',
                      'Camera ID', 'Track ID', 'Direction', 'Full Frame', 'Object ID'].map(h => (
                      <th key={h} style={{
                        padding: '13px 14px', textAlign: 'left', fontSize: 10,
                        color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase',
                        letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {anprDetections.map((det, idx) => (
                    <tr key={det.id}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* S.No. */}
                      <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>
                        {((anprPage - 1) * anprPageSize) + idx + 1}
                      </td>

                      {/* Capture Time */}
                      <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                        {new Date(det.timestamp).toLocaleString()}
                      </td>

                      {/* Plate Thumbnail — VehicleLog.jsx pattern reused */}
                      <td style={{ padding: '11px 14px' }}>
                        <div
                          onClick={() => setLightboxItem(det)}
                          style={{
                            width: 48, height: 48, background: '#0f172a', borderRadius: 8,
                            overflow: 'hidden', cursor: 'pointer', border: '1px solid #334155',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'transform 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          {det.plateCropUrl ? (
                            <img
                              src={det.plateCropUrl} loading="lazy"
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                              alt="Plate crop"
                              onError={e => { e.target.style.display = 'none' }}
                            />
                          ) : (
                            <span style={{ fontSize: 16 }}>🔍</span>
                          )}
                        </div>
                      </td>

                      {/* Vehicle Type badge */}
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                          background: 'rgba(79,109,245,0.12)', border: '1px solid rgba(79,109,245,0.3)',
                          color: '#4f6df5', textTransform: 'capitalize',
                        }}>
                          {det.vehicleType || 'unknown'}
                        </span>
                      </td>

                      {/* Plate Status */}
                      <td style={{ padding: '11px 14px' }}>
                        {det.plateNumber ? (
                          <span style={{
                            background: 'var(--surface-2)', padding: '4px 10px',
                            borderRadius: 6, border: '1px solid var(--border)',
                            fontSize: 12, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.05em',
                          }}>{det.plateNumber}</span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', fontStyle: 'italic' }}>
                            No Plate Detected
                          </span>
                        )}
                      </td>

                      {/* Camera ID */}
                      <td style={{ padding: '11px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {det.cameraId}
                      </td>

                      {/* Track ID */}
                      <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                        #{det.trackId ?? 'N/A'}
                      </td>

                      {/* Direction badge — VehicleLog.jsx direction badge pattern */}
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                          background: det.direction === 'entering' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                          border: `1px solid ${det.direction === 'entering' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                          color: det.direction === 'entering' ? '#16a34a' : '#f59e0b',
                          textTransform: 'uppercase',
                        }}>
                          {det.direction || 'N/A'}
                        </span>
                      </td>

                      {/* Full Frame icon → opens lightbox */}
                      <td style={{ padding: '11px 14px' }}>
                        <button
                          onClick={() => setLightboxItem(det)}
                          disabled={!det.imageUrl}
                          style={{
                            background: det.imageUrl ? 'var(--surface-2)' : 'transparent',
                            border: '1px solid var(--border)', borderRadius: 8,
                            padding: '6px 10px', cursor: det.imageUrl ? 'pointer' : 'not-allowed',
                            fontSize: 16, lineHeight: 1,
                          }}
                          title={det.imageUrl ? 'View full frame' : 'No image available'}
                        >🖼️</button>
                      </td>

                      {/* Object ID truncated + copy */}
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                            …{det.id.slice(-8)}
                          </span>
                          <button
                            onClick={() => navigator.clipboard.writeText(det.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-3)', padding: 2 }}
                            title="Copy full Object ID"
                          >📋</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {anprTotal > anprPageSize && (
              <div style={{
                padding: '14px 24px', background: 'var(--surface)',
                borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                  Showing {((anprPage - 1) * anprPageSize) + 1}–
                  {Math.min(anprPage * anprPageSize, anprTotal)} of {anprTotal}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    disabled={anprPage === 1}
                    onClick={() => handleAnprPageChange(anprPage - 1)}
                    style={{
                      background: anprPage === 1 ? 'transparent' : 'var(--surface-2)',
                      border: '1px solid var(--border)', padding: '6px 14px', borderRadius: 8,
                      cursor: anprPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 700, color: 'var(--text)',
                    }}
                  >← Prev</button>
                  <span style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
                    {anprPage} / {Math.ceil(anprTotal / anprPageSize)}
                  </span>
                  <button
                    disabled={anprPage >= Math.ceil(anprTotal / anprPageSize)}
                    onClick={() => handleAnprPageChange(anprPage + 1)}
                    style={{
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, color: 'var(--text)',
                    }}
                  >Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isVehicleDetection && ran && !busy && anprDetections.length === 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '48px 24px', textAlign: 'center',
          color: 'var(--text-3)', fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow)',
        }}>
          🚗 No vehicle detection records found for the selected camera and period.
        </div>
      )}

      {/* ── Lightbox modal — copied from VehicleLog.jsx ──────────────────── */}
      {lightboxItem && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            zIndex: 1000, display: 'flex', alignItems: 'center',
            justifyContent: 'center', backdropFilter: 'blur(8px)',
          }}
          onClick={() => setLightboxItem(null)}
        >
          <div
            style={{
              background: 'var(--surface)', borderRadius: 20, width: '96%',
              maxWidth: 1100, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🚗 Vehicle Crossing Evidence
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>
                  Track #{lightboxItem.trackId ?? 'N/A'} | Camera: {lightboxItem.cameraId}
                </div>
              </div>
              <button
                onClick={() => setLightboxItem(null)}
                style={{ background: 'var(--surface-2)', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', display: 'flex', color: 'var(--text)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Two-column: Full Frame | Plate Crop */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr', minHeight: 400 }}>
              <div style={{ background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRight: '1px solid #222' }}>
                <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, letterSpacing: '0.05em' }}>FULL FRAME</div>
                {lightboxItem.imageUrl ? (
                  <img src={lightboxItem.imageUrl} style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }} alt="Full frame snapshot" />
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>No frame available</div>
                )}
              </div>

              <div style={{ background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRight: '1px solid #222' }}>
                <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(79,109,245,0.8)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, letterSpacing: '0.05em' }}>PLATE CROP</div>
                {lightboxItem.plateCropUrl ? (
                  <img src={lightboxItem.plateCropUrl} style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }} alt="Plate crop" />
                ) : (
                  <div style={{ color: '#64748b', fontSize: 13, fontWeight: 600, textAlign: 'center', padding: 24 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                    No plate crop available
                  </div>
                )}
              </div>

              {/* Metadata column */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14, borderLeft: '1px solid var(--border)', background: 'var(--surface)' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vehicle Properties</span>
                {[
                  { label: 'Plate Status', value: lightboxItem.plateNumber || 'No Plate Detected' },
                  { label: 'Vehicle Type', value: lightboxItem.vehicleType ? lightboxItem.vehicleType.toUpperCase() : 'UNKNOWN' },
                  { label: 'Direction', value: lightboxItem.direction ? lightboxItem.direction.toUpperCase() : 'UNKNOWN', isDir: true },
                  { label: 'Camera ID', value: lightboxItem.cameraId || 'Unknown' },
                  { label: 'Track ID', value: `#${lightboxItem.trackId ?? 'N/A'}` },
                  { label: 'Timestamp', value: new Date(lightboxItem.timestamp).toLocaleString() },
                ].map((item, idx) => (
                  <div key={idx} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.isDir && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.value.toLowerCase() === 'ENTERING' ? '#22c55e' : '#f59e0b' }} />
                      )}
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Right-side toast notification ──────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: 'fixed', top: 24, right: 24, zIndex: 9999,
            minWidth: 300, maxWidth: 420,
            background: toast.type === 'success' ? '#0f2d1f' : toast.type === 'error' ? '#2d0f0f' : '#0f1a2d',
            border: `1px solid ${toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : '#4f6df5'}`,
            borderRadius: 14, padding: '16px 20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-start', gap: 12,
            animation: 'slideInRight 0.3s ease',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 12, fontWeight: 700,
              color: toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : '#60a5fa',
              lineHeight: 1.5,
            }}>
              {toast.msg}
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16, padding: 0, lineHeight: 1, marginTop: 1 }}
          >✕</button>
        </div>
      )}
    </div>
  )
}