import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Activity, Users, Car, Maximize2, Zap, RefreshCw } from 'lucide-react'
import { useCameras }    from '../hooks/useCameras.js'
import MiniCanvas        from '../components/camera/MiniCanvas.jsx'
import { Loading }       from '../components/shared/index.jsx'
import { sseManager }    from '../lib/sseManager.js'
import { useAuthStore }  from '../store/index.js'
import { UC_CANVAS, UC_COLOR } from '../constants/useCases.js'
import { analyticsAPI }  from '../services/api.js'

const BACKEND_UC = uc => uc === 'traffic' ? 'vehicle_count' : uc
const DISPLAY_UC = uc => uc === 'vehicle_count' ? 'traffic' : uc

const UC_META = {
  traffic:      { label: 'Vehicle Count', color: '#0ea5e9', icon: Car,   unit: 'vehicles' },
  vehicle_count:{ label: 'Vehicle Count', color: '#0ea5e9', icon: Car,   unit: 'vehicles' },
  people_count: { label: 'People Count',  color: '#4f6df5', icon: Users, unit: 'persons'  },
}

// ── Safely extract a numeric field from REST response ──────────
function extractNum(obj, keys) {
  if (!obj) return null
  for (const k of keys) {
    const v = obj[k]
    if (v != null && !isNaN(Number(v))) return Number(v)
    // nested: obj.metrics.key
    if (obj.metrics?.[k] != null) return Number(obj.metrics[k])
    if (obj.data?.[k] != null)    return Number(obj.data[k])
    if (obj.counts?.[k] != null)  return Number(obj.counts[k])
  }
  return null
}

export default function CameraAnalytics() {
  const { id } = useParams()
  const nav    = useNavigate()
  const { cameras, loading } = useCameras()
  const hasCameraAccess = useAuthStore(s => s.hasCameraAccess)

  const cam   = cameras.find(c => c.id === id || c.camera_id === id)
  const camId = cam?.id || cam?.camera_id || id
  const location = useLocation()
  
  const currentPathUseCase = location.pathname.includes('/people_count') ? 'people_count'
                             : location.pathname.includes('/traffic') ? 'traffic'
                             : location.pathname.includes('/crowd_alert') ? 'crowd_alert'
                             : location.pathname.includes('/intrusion') ? 'intrusion'
                             : null

  // ── REST analytics (polled every 5s) ──────────────────────
  const [peopleStats,  setPeopleStats]  = useState(null) // from /api/analytics/people/{id}
  const [vehicleStats, setVehicleStats] = useState(null) // from /api/analytics/traffic/{id}
  const [statsLoading, setStatsLoading] = useState(true)

  // ── In-frame count (from bbox SSE latest payload) ──────────
  const [inFrame,  setInFrame]  = useState({})   // { traffic: 5, people_count: 3 }
  const [detLog,   setDetLog]   = useState([])   // accumulated detection log
  const [activeFilters, setActiveFilters] = useState([])

  // ── Session unique tracks seen (fallback when REST counts are 0) ──
  const [seenVehicleIds, setSeenVehicleIds] = useState(new Set())
  const [seenPeopleIds,  setSeenPeopleIds]  = useState(new Set())

  const toggleFilter = uc =>
    setActiveFilters(prev => prev.includes(uc) ? prev.filter(f => f !== uc) : [...prev, uc])

  // Auth check
  useEffect(() => {
    if (!loading && !hasCameraAccess(id)) nav('/access-denied', { replace: true })
  }, [id, loading, hasCameraAccess, nav])

  // Set active filters once camera loads
  useEffect(() => {
    if (cam) {
      const ucs = currentPathUseCase 
        ? [currentPathUseCase]
        : [...new Set((cam.enabled_usecases || [cam.useCase] || []).map(DISPLAY_UC))]
      setActiveFilters(ucs)
    }
  }, [cam, currentPathUseCase])

  // ── Fetch REST snapshot ONCE on mount, then use live SSE ──
  useEffect(() => {
    if (!camId) return
    let mounted = true

    const fetchStats = async () => {
      try {
        const [pRes, vRes] = await Promise.allSettled([
          analyticsAPI.getPeople(camId),
          analyticsAPI.getTraffic(camId),
        ])
        if (!mounted) return
        if (pRes.status === 'fulfilled') setPeopleStats(pRes.value)
        if (vRes.status === 'fulfilled') setVehicleStats(vRes.value)
      } catch (e) {
        console.warn('[CameraAnalytics] initial stats fetch:', e)
      } finally {
        if (mounted) setStatsLoading(false)
      }
    }

    fetchStats()

    // ── Subscribe to Live SSE Count streams ──
    const handlePeopleCount = (payload) => {
      console.log('[SSE People Live Count]', payload)
      setPeopleStats(prev => {
        if (!payload) return prev
        const data = payload.data || payload
        const next = { ...prev, ...payload, data }
        const metricsSource = data.metrics || data
        next.metrics = {
          ...(prev?.metrics || {}),
          ...(data.metrics || {}),
          total:     metricsSource.total     ?? metricsSource.count     ?? metricsSource.people_count ?? prev?.metrics?.total,
          count_in:  metricsSource.count_in  ?? metricsSource.in        ?? metricsSource.in_count     ?? prev?.metrics?.count_in,
          count_out: metricsSource.count_out ?? metricsSource.out       ?? metricsSource.out_count    ?? prev?.metrics?.count_out,
        }
        return next
      })
    }

    const unsubPeople1 = sseManager.subscribe(`/api/sse/people/${camId}`, 'people',  handlePeopleCount)
    const unsubPeople2 = sseManager.subscribe(`/api/sse/people/${camId}`, 'message', handlePeopleCount)

    const handleVehicleCount = (payload) => {
      console.log('[SSE Vehicles Live Count]', payload)
      setVehicleStats(prev => {
        if (!payload) return prev
        const data = payload.data || payload
        const next = { ...prev, ...payload, data }
        const countsSource = data.counts || data
        next.counts = {
          ...(prev?.counts || {}),
          ...(data.counts || {}),
          IN:  countsSource.IN  ?? countsSource.in  ?? countsSource.line_count_in  ?? countsSource.count_in  ?? prev?.counts?.IN,
          OUT: countsSource.OUT ?? countsSource.out ?? countsSource.line_count_out ?? countsSource.count_out ?? prev?.counts?.OUT,
        }
        return next
      })
    }

    const unsubVehicles1 = sseManager.subscribe(`/api/sse/vehicles/${camId}`, 'vehicles', handleVehicleCount)
    const unsubVehicles2 = sseManager.subscribe(`/api/sse/vehicles/${camId}`, 'message',  handleVehicleCount)

    return () => {
      mounted = false
      unsubPeople1()
      unsubPeople2()
      unsubVehicles1()
      unsubVehicles2()
    }
  }, [camId])

  // ── SSE bbox detections — in-frame + log ──────────────────
  useEffect(() => {
    if (!cam) return
    setDetLog([])
    setInFrame({})
    setSeenVehicleIds(new Set())
    setSeenPeopleIds(new Set())

    const seen    = new Set()
    const ucList  = (cam.enabled_usecases || [cam.useCase] || []).filter(uc => {
      const b = BACKEND_UC(uc)
      if (seen.has(b)) return false
      seen.add(b); return true
    })

    const unsubs = ucList.map(rawUc => {
      const backendUc  = BACKEND_UC(rawUc)
      const frontendUc = DISPLAY_UC(rawUc)
      const url        = `/api/sse/cameras/${camId}/detections/${backendUc}`
      const color      = UC_COLOR[frontendUc] || UC_CANVAS[frontendUc]?.color || '#64748b'

      const handle = (payload) => {
        const objects = Array.isArray(payload)
          ? payload
          : (payload?.objects ?? payload?.detections ?? [])
        if (objects.length === 0) return

        // Update in-frame (latest payload object count)
        setInFrame(prev => ({ ...prev, [frontendUc]: objects.length }))

        // Update unique session track IDs
        if (frontendUc === 'traffic') {
          setSeenVehicleIds(prev => {
            const next = new Set(prev)
            objects.forEach(o => { if (o.id) next.add(o.id) })
            return next
          })
        } else if (frontendUc === 'people_count') {
          setSeenPeopleIds(prev => {
            const next = new Set(prev)
            objects.forEach(o => { if (o.id) next.add(o.id) })
            return next
          })
        }

        const formatTime = (tsSec) => {
          const date = tsSec ? new Date(tsSec * 1000) : new Date();
          const pad = (num) => String(num).padStart(2, '0');
          const ms = String(date.getMilliseconds()).padStart(3, '0');
          return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
        };
        const tsString = formatTime(payload?.timestamp);
        const now = Date.now()
        const newDets = objects.map((obj, i) => {
          const conf    = obj.confidence ?? 0
          const confPct = conf > 1 ? Number(conf).toFixed(1) : (conf * 100).toFixed(1)
          return {
            key:        `${frontendUc}-${obj.id || now}-${i}`,
            label:      obj.label || UC_CANVAS[frontendUc]?.label || frontendUc,
            useCase:    frontendUc,
            confidence: confPct,
            color,
            ts:         tsString,
          }
        })
        setDetLog(prev => [...newDets, ...prev].slice(0, 100))
      }

      const u1 = sseManager.subscribe(url, backendUc,   handle)
      const u2 = sseManager.subscribe(url, 'detection', handle)
      const u3 = sseManager.subscribe(url, 'message',   handle)
      return () => { u1(); u2(); u3() }
    })

    return () => {
      unsubs.forEach(fn => fn())
      setDetLog([])
      setInFrame({})
      setSeenVehicleIds(new Set())
      setSeenPeopleIds(new Set())
    }
  }, [cam?.id])

  // ─────────────────────────────────────────────────────────
  if (loading && cameras.length === 0) return <Loading msg="Loading camera…" />
  if (!cam) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Camera not found.</div>
  if (!hasCameraAccess(id)) return null

  const displayUCs = currentPathUseCase 
    ? [currentPathUseCase] 
    : [...new Set((cam.enabled_usecases || [cam.useCase] || []).map(DISPLAY_UC))]

  // ── Parse REST response (handles various backend shapes) ──
  // People: /api/analytics/people → total, count_in, count_out
  const backendPeopleTotal = extractNum(peopleStats, ['total', 'count', 'people_count', 'total_count'])
  const peopleIn           = extractNum(peopleStats, ['count_in', 'in', 'in_count', 'entry_count'])
  const peopleOut          = extractNum(peopleStats, ['count_out', 'out', 'out_count', 'exit_count'])
  const peopleTotal        = (backendPeopleTotal && backendPeopleTotal > 0) ? backendPeopleTotal : Math.max(backendPeopleTotal || 0, seenPeopleIds.size)

  // Vehicle: /api/analytics/traffic → counts.IN, counts.OUT, data.total_count, etc.
  const vehicleIn          = vehicleStats?.counts?.IN  ?? vehicleStats?.counts?.in  ?? extractNum(vehicleStats, ['line_count_in', 'count_in', 'in', 'in_count'])
  const vehicleOut         = vehicleStats?.counts?.OUT ?? vehicleStats?.counts?.out ?? extractNum(vehicleStats, ['line_count_out', 'count_out', 'out', 'out_count'])
  const backendVehicleTotal = extractNum(vehicleStats, ['total_count', 'cumulative_total_today', 'total', 'count']) ?? 
                              ((vehicleIn != null || vehicleOut != null) ? (vehicleIn ?? 0) + (vehicleOut ?? 0) : null)
  const vehicleTotal        = (backendVehicleTotal && backendVehicleTotal > 0) ? backendVehicleTotal : Math.max(backendVehicleTotal || 0, seenVehicleIds.size)
  
  const vehicleInFrame      = inFrame['traffic'] ?? extractNum(vehicleStats, ['vehicles_in_frame', 'vehicle_count']) ?? 0
  const peopleInFrame       = inFrame['people_count'] ?? extractNum(peopleStats, ['current_frame_count', 'people_in_frame', 'count']) ?? 0
  const congestion          = vehicleStats?.congestion_level ?? null

  const hasPeople  = displayUCs.includes('people_count')
  const hasVehicle = displayUCs.includes('traffic')
  const filteredLog = detLog.filter(d => activeFilters.includes(d.useCase))

  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button onClick={() => nav(-1)} style={{
          background: '#fff', border: '1px solid var(--border)', padding: 8,
          borderRadius: '50%', cursor: 'pointer', display: 'flex',
          color: 'var(--text)', boxShadow: 'var(--shadow-sm)',
        }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {cam.name}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
            {cam.location} • {camId} • <span style={{ color: '#16a34a', fontWeight: 700 }}>● LIVE</span>
          </p>
        </div>

        {/* Filter pills with in-frame count badge */}
        <div style={{ display: 'flex', gap: 6 }}>
          {displayUCs.map(uc => {
            const meta = UC_META[uc] || { label: uc, color: '#64748b', icon: Activity }
            const Icon = meta.icon
            const on   = activeFilters.includes(uc)
            const frm  = inFrame[uc] || 0
            return (
              <button key={uc} onClick={() => toggleFilter(uc)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s', fontWeight: 700,
                background: on ? `${meta.color}15` : '#f1f5f9',
                border: `1.5px solid ${on ? meta.color + '66' : '#e2e8f0'}`,
                color: on ? meta.color : '#64748b', fontSize: 12,
              }}>
                <Icon size={13} />
                {meta.label}
                {frm > 0 && (
                  <span style={{ background: on ? meta.color : '#cbd5e1', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 900 }}>
                    {frm}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <button onClick={() => nav(`/camera/${camId}`)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
          background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8,
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          <Maximize2 size={14} /> FULL CANVAS
        </button>
      </div>

      {/* ── Main Row: Video + Stats ────────────────────────── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Video feed (Clean card layout, no redundant stretching or dark wrappers) */}
        <div style={{ width: 460, flexShrink: 0 }}>
          <MiniCanvas camera={cam} activeUseCase={currentPathUseCase} onClick={() => {}} onDoubleClick={() => nav(`/camera/${camId}`)} />
        </div>

        {/* Stats column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── People Count Card ───────────────────────── */}
          {hasPeople && (
            <div style={{
              flex: 1, background: '#fff', borderRadius: 'var(--radius)',
              border: '1px solid #dbeafe', padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(59,130,246,0.08)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#93c5fd', letterSpacing: 2, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Users size={12} /> People Count
                {statsLoading && <span style={{ fontSize: 9, color: '#cbd5e1', marginLeft: 4 }}>loading…</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                {/* Total from REST */}
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>TOTAL</div>
                  <div style={{ fontSize: 52, fontWeight: 900, color: '#1e40af', lineHeight: 1 }}>
                    {peopleTotal ?? (peopleStats ? '0' : '--')}
                  </div>
                  {peopleIn != null && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>IN</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#2563eb' }}>{peopleIn}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>OUT</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#7c3aed' }}>{peopleOut ?? '--'}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* In Frame from SSE */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>IN FRAME</div>
                  <div style={{
                    fontSize: 44, fontWeight: 900, color: peopleInFrame > 0 ? '#4f6df5' : '#cbd5e1',
                    lineHeight: 1, transition: 'color 0.3s',
                  }}>
                    {peopleInFrame}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>currently visible</div>
                </div>
              </div>

              <div style={{ marginTop: 16, height: 3, background: '#eff6ff', borderRadius: 2 }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #3b82f6, #818cf8)',
                  width: peopleTotal > 0 ? `${Math.min(100, (peopleTotal / (peopleTotal + 10)) * 100)}%` : '0%',
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>
          )}

          {/* ── Vehicle Count Card ───────────────────────── */}
          {hasVehicle && (
            <div style={{
              flex: 1, background: '#fff', borderRadius: 'var(--radius)',
              border: '1px solid #d1fae5', padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(16,185,129,0.08)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#6ee7b7', letterSpacing: 2, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Car size={12} /> Vehicle Count
                {congestion && (
                  <span style={{
                    marginLeft: 8, padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 900,
                    background: congestion === 'high' ? '#fee2e2' : congestion === 'medium' ? '#fef3c7' : '#d1fae5',
                    color:      congestion === 'high' ? '#ef4444' : congestion === 'medium' ? '#d97706' : '#059669',
                  }}>
                    {congestion.toUpperCase()}
                  </span>
                )}
                {statsLoading && <span style={{ fontSize: 9, color: '#cbd5e1', marginLeft: 4 }}>loading…</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                {/* Total from REST */}
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>TOTAL</div>
                  <div style={{ fontSize: 52, fontWeight: 900, color: '#065f46', lineHeight: 1 }}>
                    {vehicleTotal ?? (vehicleStats ? '0' : '--')}
                  </div>
                  {vehicleIn != null && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>IN</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#059669' }}>{vehicleIn}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>OUT</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{vehicleOut ?? '--'}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* In Frame from SSE bbox */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>IN FRAME</div>
                  <div style={{
                    fontSize: 44, fontWeight: 900, lineHeight: 1, transition: 'color 0.3s',
                    color: vehicleInFrame > 0 ? '#0ea5e9' : '#cbd5e1',
                  }}>
                    {vehicleInFrame}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>currently visible</div>
                </div>
              </div>

              <div style={{ marginTop: 16, height: 3, background: '#ecfdf5', borderRadius: 2 }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #10b981, #0ea5e9)',
                  width: vehicleTotal > 0 ? `${Math.min(100, (vehicleTotal / (vehicleTotal + 10)) * 100)}%` : '0%',
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Live Detection Log ────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={15} color="#2563eb" />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Live Detection Log</span>
            {filteredLog.length > 0 && (
              <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 10 }}>
                {filteredLog.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setDetLog([])}
            style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Clear
          </button>
        </div>

        {filteredLog.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            <Zap size={24} style={{ opacity: 0.15, display: 'block', margin: '0 auto 10px' }} />
            Waiting for detection stream…
            <div style={{ fontSize: 11, marginTop: 6, color: '#cbd5e1' }}>
              {displayUCs.map(uc => `/api/sse/cameras/${camId}/detections/${BACKEND_UC(uc)}`).join(' · ')}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 340 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                <tr>
                  {['#', 'USECASE', 'LABEL', 'CONFIDENCE', 'TIME'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: h === 'TIME' ? 'right' : 'left', borderBottom: '1px solid #e2e8f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLog.map((det, idx) => {
                  const meta = UC_META[det.useCase] || { color: '#64748b', icon: Activity }
                  const Icon = meta.icon
                  return (
                    <tr key={det.key + idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx === 0 ? `${meta.color}05` : 'transparent' }}>
                      <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>
                        {filteredLog.length - idx}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: meta.color, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>
                          <Icon size={13} /> {meta.label}
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, background: `${meta.color}15`, color: meta.color, fontSize: 12, fontWeight: 800, textTransform: 'capitalize' }}>
                          {det.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 64, height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${Math.min(100, Number(det.confidence))}%`, background: meta.color, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{det.confidence}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 12, fontWeight: 600, textAlign: 'right' }}>
                        {det.ts}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
