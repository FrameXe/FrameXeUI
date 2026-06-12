import { useState, useEffect, useRef, useCallback } from 'react'
import { attachHLS } from '../../services/hls.js'
import { startMultiUsecaseFeed } from '../../services/liveDetections.js'
import { drawDetBox, drawCountLine, drawMockBg, crossesLine } from '../../services/canvasDraw.js'
import { UC_COLOR, UC_MAP, UC_CANVAS } from '../../constants/useCases.js'
import { useCameraAlerts } from '../../hooks/useAlerts.js'
import { Btn, Tag, SEV_COLOR } from '../shared/index.jsx'
import { cameraAPI } from '../../services/api.js'

export default function CanvasEditor({ camera, onClose }) {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const animRef = useRef(null)
  const frameRef = useRef(0)
  const detsRef = useRef([])
  const lineRef = useRef(null)
  const countRef = useRef(0)
  const crossedIds = useRef(new Set())

  // All enabled usecases for this camera
  const allUsecases = camera.enabled_usecases || [camera.useCase] || []

  // Active usecases — all ON by default (multi-toggle)
  const [activeUCs, setActiveUCs] = useState(new Set(allUsecases))

  const toggleUC = (uc) => {
    setActiveUCs(prev => {
      const next = new Set(prev)
      if (next.has(uc)) { if (next.size > 1) next.delete(uc) } // keep at least 1
      else next.add(uc)
      return next
    })
  }

  const [mode, setMode] = useState('view')
  const [drawStart, setDrawStart] = useState(null)
  const [mousePos, setMousePos] = useState(null)
  const [countLine, setCountLine] = useState(null)
  const [lineCount, setLineCount] = useState(0)
  const [flashRed, setFlashRed] = useState(false)
  const [crossLog, setCrossLog] = useState([])
  const [detFeed, setDetFeed] = useState([])
  const [tab, setTab] = useState('detections')
  const [hlsReady, setHlsReady] = useState(false)
  const [totalDets, setTotalDets] = useState(0)

  // ── ROI / Polygon Zone State ──────────────────────────────
  const [zonePoints, setZonePoints] = useState([])      // finalized polygon vertices (canvas px)
  const [zoneDraft, setZoneDraft]   = useState([])      // in-progress vertices while drawing
  const [roiSaving, setRoiSaving]   = useState(false)   // loading indicator for save API
  const [roiMsg,    setRoiMsg]      = useState(null)     // success / error message

  // YouTube detection
  const ytRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const ytMatch = camera.hlsUrl?.match(ytRegex)
  const ytId = (ytMatch && ytMatch[2]?.length === 11) ? ytMatch[2] : null
  const isYt = !!ytId

  // Primary usecase for alerts (first active)
  const primaryUC = [...activeUCs][0] || allUsecases[0] || 'people_count'
  const { alerts, loading: alertLoad, ack } = useCameraAlerts(camera.id, primaryUC)
  const unackedCount = alerts.filter(a => !a.acknowledged).length

  // ── Load saved ROI from backend on mount ──────────────────
  useEffect(() => {
    cameraAPI.getROI(camera.id)
      .then(data => {
        if (data?.roi_area?.length >= 3) {
          // Denormalize from 0-1 back to canvas pixel coordinates (1280x720)
          const pts = data.roi_area.map(p => ({
            x: p.x * 1280,
            y: p.y * 720,
          }))
          setZonePoints(pts)
        }
      })
      .catch(() => {}) // silently fail if no config yet
  }, [camera.id])

  // HLS
  useEffect(() => {
    if (!camera.hlsUrl || isYt) return
    let inst = null
    attachHLS(videoRef.current, camera.hlsUrl).then(h => {
      inst = h
      const t = setInterval(() => {
        if (videoRef.current?.readyState >= 2) { setHlsReady(true); clearInterval(t) }
      }, 400)
    })
    return () => { inst?.destroy(); setHlsReady(false) }
  }, [camera.hlsUrl, isYt])

  // ── Detection feed — ALL active usecases simultaneously ─────
  useEffect(() => {
    detsRef.current = []
    setDetFeed([])
    const ucArray = [...activeUCs]
    if (ucArray.length === 0) return
    const stop = startMultiUsecaseFeed(camera, ucArray, (det) => {
      detsRef.current = [...detsRef.current.slice(-30), det]
      setDetFeed(p => [{ ...det, ts: new Date().toLocaleTimeString() }, ...p.slice(0, 79)])
      setTotalDets(n => n + 1)
    })
    return stop
  }, [camera, activeUCs])

  // Crossing check
  useEffect(() => {
    if (!lineRef.current) return
    const canvas = canvasRef.current; if (!canvas) return
    let hit = false
    detsRef.current.forEach(det => {
      if (!det.hasBbox || crossedIds.current.has(det.id)) return
      if (crossesLine(det, lineRef.current, canvas.width, canvas.height)) {
        crossedIds.current.add(det.id); det.crossed = true; countRef.current++; hit = true
        setCrossLog(p => [{ label: det.label, confidence: det.confidence, speedVal: det.speedVal, ts: new Date().toLocaleTimeString() }, ...p.slice(0, 99)])
      }
    })
    if (hit) { setLineCount(countRef.current); setFlashRed(true); setTimeout(() => setFlashRed(false), 400) }
  }, [detFeed])

  // ── Draw polygon zone on canvas ───────────────────────────
  const drawZone = useCallback((ctx, points, draft, cursorPos) => {
    // Draw finalized zone polygon (filled + border)
    if (points.length >= 2) {
      ctx.save()
      ctx.strokeStyle = '#00cfff'
      ctx.lineWidth = 2
      ctx.shadowColor = '#00cfff'
      ctx.shadowBlur = 10
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      points.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.closePath()
      ctx.fillStyle = 'rgba(0, 207, 255, 0.10)'
      ctx.fill()
      ctx.stroke()
      // Vertex dots
      points.forEach(p => {
        ctx.fillStyle = '#00ff88'
        ctx.shadowColor = '#00ff88'
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.restore()
    }
    // Draw in-progress draft polygon (dashed)
    if (draft.length > 0 && cursorPos) {
      ctx.save()
      ctx.strokeStyle = '#ffd600'
      ctx.lineWidth = 1.5
      ctx.setLineDash([8, 5])
      ctx.shadowColor = '#ffd600'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.moveTo(draft[0].x, draft[0].y)
      draft.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.lineTo(cursorPos.x, cursorPos.y)
      ctx.stroke()
      // Draft vertex dots
      draft.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? '#00ff88' : '#ffd600'
        ctx.shadowColor = ctx.fillStyle
        ctx.shadowBlur = 4
        ctx.beginPath()
        ctx.arc(p.x, p.y, i === 0 ? 7 : 4, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.restore()
    }
  }, [])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    let running = true
    const render = () => {
      if (!running) return
      frameRef.current++
      const W = canvas.width, H = canvas.height
      const vid = videoRef.current
      if (camera.hlsUrl && !isYt && vid?.readyState >= 2) {
        ctx.drawImage(vid, 0, 0, W, H)
        ctx.fillStyle = 'rgba(0,0,0,0.025)'
        for (let y = (frameRef.current * 2) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1)
      } else if (!isYt) {
        drawMockBg(ctx, W, H, frameRef.current, camera.name)
      } else {
        ctx.clearRect(0, 0, W, H)
      }
      detsRef.current = detsRef.current.map(d => ({ ...d, age: d.age + 1, alpha: Math.max(0, 1 - d.age / 80) })).filter(d => d.alpha > 0.04)
      detsRef.current.forEach(d => drawDetBox(ctx, d, W, H))
      const draft = drawStart && mousePos ? { x1: drawStart.x, y1: drawStart.y, x2: mousePos.x, y2: mousePos.y } : null
      drawCountLine(ctx, lineRef.current, countRef.current, draft)

      // Draw ROI polygon zone
      drawZone(ctx, zonePoints, zoneDraft, mode === 'draw_zone' ? mousePos : null)

      if (flashRed) { ctx.fillStyle = 'rgba(255,0,0,0.1)'; ctx.fillRect(0, 0, W, H) }

      // OSD
      ctx.font = "11px 'Courier New'"
      ctx.fillStyle = '#00cfff77'
      ctx.fillText(`${camera.name.toUpperCase()} | ${[...activeUCs].join(' + ').toUpperCase()}`, 12, 20)
      ctx.font = "9px 'Courier New'"; ctx.fillStyle = 'rgba(255,255,255,0.25)'
      const ucLabels = [...activeUCs].map(uc => (UC_CANVAS[uc]?.label || uc).toUpperCase()).join(' · ')
      ctx.fillText(ucLabels, 12, 34)
      if (zonePoints.length >= 3) {
        ctx.font = "9px 'Courier New'"; ctx.fillStyle = '#00cfff99'
        ctx.fillText('● DETECTION ZONE ACTIVE', 12, 50)
      }

      animRef.current = requestAnimationFrame(render)
    }
    animRef.current = requestAnimationFrame(render)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [camera, drawStart, mousePos, flashRed, activeUCs, isYt, zonePoints, zoneDraft, mode, drawZone])

  // Mouse handlers
  const getPos = useCallback((e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (canvasRef.current.width / r.width), y: (e.clientY - r.top) * (canvasRef.current.height / r.height) }
  }, [])
  const onDown = useCallback((e) => { if (mode !== 'draw') return; setDrawStart(getPos(e)); lineRef.current = null; setCountLine(null); countRef.current = 0; crossedIds.current = new Set(); setLineCount(0) }, [mode, getPos])
  const onMove = useCallback((e) => setMousePos(getPos(e)), [getPos])
  const onUp = useCallback((e) => {
    if (mode !== 'draw' || !drawStart) return
    const end = getPos(e)
    if (Math.hypot(end.x - drawStart.x, end.y - drawStart.y) > 25) { const l = { x1: drawStart.x, y1: drawStart.y, x2: end.x, y2: end.y }; lineRef.current = l; setCountLine(l) }
    setDrawStart(null); setMode('view')
  }, [mode, drawStart, getPos])
  const clearLine = () => { lineRef.current = null; setCountLine(null); countRef.current = 0; crossedIds.current = new Set(); setLineCount(0); setCrossLog([]) }

  // ── Polygon Zone Handlers ─────────────────────────────────
  const onZoneClick = useCallback((e) => {
    if (mode !== 'draw_zone') return
    const pos = getPos(e)
    setZoneDraft(prev => {
      // Close polygon if user clicks near first point (within 15px)
      if (prev.length >= 3) {
        const first = prev[0]
        if (Math.hypot(pos.x - first.x, pos.y - first.y) < 15) {
          setZonePoints(prev)       // finalize
          setMode('view')
          return []                 // clear draft
        }
      }
      return [...prev, pos]        // add vertex
    })
  }, [mode, getPos])

  const onZoneDblClick = useCallback((e) => {
    if (mode !== 'draw_zone') return
    setZoneDraft(prev => {
      if (prev.length >= 3) {
        setZonePoints(prev)  // finalize on double-click
        setMode('view')
      }
      return []
    })
  }, [mode])

  const clearZone = () => {
    setZonePoints([])
    setZoneDraft([])
    setRoiMsg(null)
  }

  // ── Save ROI to backend ───────────────────────────────────
  const saveROI = async () => {
    if (zonePoints.length < 3) return
    setRoiSaving(true)
    setRoiMsg(null)
    try {
      // Normalize canvas coords (1280x720) → 0.0 to 1.0
      const normalized = zonePoints.map(p => ({
        x: parseFloat((p.x / 1280).toFixed(4)),
        y: parseFloat((p.y / 720).toFixed(4)),
      }))
      await cameraAPI.saveROI(camera.id, normalized)
      setRoiMsg({ ok: true, text: 'Zone saved! Backend will apply filter.' })
    } catch (err) {
      setRoiMsg({ ok: false, text: 'Save failed: ' + err.message })
    } finally {
      setRoiSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04080f', display: 'flex', flexDirection: 'column', fontFamily: "'Courier New',monospace", color: '#c8d8e8', zIndex: 1000 }}>
      <video ref={videoRef} style={{ display: 'none' }} muted playsInline autoPlay />

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid #0d1e2e', background: '#060d18', flexShrink: 0, flexWrap: 'wrap' }}>
        <Btn onClick={onClose}>← BACK</Btn>
        <span style={{ fontWeight: 'bold', fontSize: 13, letterSpacing: 1 }}>{camera.name.toUpperCase()}</span>
        <span style={{ fontSize: 10, color: '#2a4050' }}>{camera.location}</span>

        {/* Multi-usecase toggle pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
          {allUsecases.map(uc => {
            const on = activeUCs.has(uc)
            const color = UC_COLOR[uc] || '#00cfff'
            return (
              <button key={uc} onClick={() => toggleUC(uc)} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', fontSize: 9, letterSpacing: 1, cursor: 'pointer',
                background: on ? `${color}22` : 'transparent',
                border: `1px solid ${on ? color + '88' : '#1e3040'}`,
                color: on ? color : '#4a6070',
                borderRadius: 3, transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 11 }}>{UC_MAP[uc]?.emoji || '◈'}</span>
                <span>{UC_MAP[uc]?.label || uc}</span>
                {on && <span style={{ fontSize: 8, marginLeft: 2 }}>●</span>}
              </button>
            )
          })}
        </div>

        {camera.hlsUrl
          ? (isYt 
              ? <Tag color='#ff0000'>● YOUTUBE LIVE</Tag>
              : <Tag color={hlsReady ? '#00ff88' : '#ffd600'}>{hlsReady ? '● HLS LIVE' : '◌ HLS…'}</Tag>)
          : <Tag color='#2a4050'>NO SOURCE</Tag>}

        {unackedCount > 0 && <Tag color='#ff3b3b'>⚠ {unackedCount} ALERTS</Tag>}
        <div style={{ flex: 1 }} />

        <Btn active={mode === 'draw'} color='#ffd600' onClick={() => setMode(m => m === 'draw' ? 'view' : 'draw')}>
          {mode === 'draw' ? '✏ DRAWING…' : '✏ DRAW LINE'}
        </Btn>
        {countLine && <Btn color='#ff6b6b' onClick={clearLine}>✕ CLEAR LINE</Btn>}
        <div style={{ fontSize: 11, color: '#00ff88', background: 'rgba(0,255,136,0.08)', border: '1px solid #00ff8830', padding: '5px 14px', letterSpacing: 1 }}>
          CROSSINGS: <b>{lineCount}</b>
        </div>

        {/* ── ROI Zone Controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, borderLeft: '1px solid #0d1e2e', paddingLeft: 12 }}>
          <span style={{ fontSize: 9, color: '#4a6070', letterSpacing: 1 }}>DETECTION ZONE</span>
          <Btn
            active={mode === 'draw_zone'}
            color='#00cfff'
            onClick={() => {
              if (mode === 'draw_zone') { setMode('view'); setZoneDraft([]) }
              else { setMode('draw_zone'); setZoneDraft([]) }
            }}
          >
            {mode === 'draw_zone' ? '⬡ DRAWING ZONE…' : '⬡ DRAW ZONE'}
          </Btn>
          {zonePoints.length >= 3 && (
            <>
              <Btn color='#00ff88' onClick={saveROI} style={{ opacity: roiSaving ? 0.5 : 1 }}>
                {roiSaving ? '⏳ SAVING…' : '💾 SAVE ZONE'}
              </Btn>
              <Btn color='#ff6b6b' onClick={clearZone}>✕ CLEAR ZONE</Btn>
            </>
          )}
          {roiMsg && (
            <span style={{ fontSize: 9, letterSpacing: 1, color: roiMsg.ok ? '#00ff88' : '#ff6b6b' }}>
              {roiMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', cursor: mode === 'draw' ? 'crosshair' : 'default', background: '#000' }}>
          {isYt && (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&modestbranding=1`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
              allow="autoplay; encrypted-media"
            />
          )}
          <canvas ref={canvasRef} width={1280} height={720}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
            onClick={onZoneClick} onDoubleClick={onZoneDblClick}
            style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1,
              cursor: mode === 'draw' ? 'crosshair' : mode === 'draw_zone' ? 'cell' : 'default' }} />
          {mode === 'draw' && (
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,214,0,0.12)', border: '1px solid #ffd60055', color: '#ffd600', padding: '6px 22px', fontSize: 11, letterSpacing: 2, pointerEvents: 'none' }}>
              CLICK &amp; DRAG TO DRAW COUNT LINE
            </div>
          )}
          {mode === 'draw_zone' && (
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,207,255,0.10)', border: '1px solid #00cfff44', color: '#00cfff', padding: '6px 22px', fontSize: 11, letterSpacing: 2, pointerEvents: 'none', textAlign: 'center' }}>
              {zoneDraft.length === 0
                ? 'CLICK TO START DRAWING ZONE'
                : zoneDraft.length < 3
                ? `${zoneDraft.length} POINT${zoneDraft.length > 1 ? 'S' : ''} — ADD MORE (MIN 3)`
                : 'CLICK FIRST POINT TO CLOSE · OR DOUBLE-CLICK TO FINISH'}
            </div>
          )}
          {flashRed && <div style={{ position: 'absolute', inset: 0, border: '3px solid #ff3b3b', boxShadow: 'inset 0 0 40px rgba(255,0,0,0.2)', pointerEvents: 'none' }} />}
        </div>

        {/* ── RIGHT PANEL ──────────────────────────── */}
        <div style={{ width: 290, borderLeft: '1px solid #0d1e2e', background: '#060d18', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #0d1e2e', flexShrink: 0 }}>
            {[
              { id: 'detections', icon: '◈', label: 'DETECTED', count: detFeed.length, red: false },
              { id: 'crossings', icon: '✏', label: 'CROSSINGS', count: crossLog.length, red: false },
              { id: 'alerts', icon: '⚠', label: 'ALERTS', count: unackedCount, red: unackedCount > 0 },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '9px 4px', fontSize: 9, letterSpacing: 1, cursor: 'pointer', border: 'none',
                background: tab === t.id ? '#0a1528' : 'transparent',
                color: tab === t.id ? '#00cfff' : '#2a4050',
                borderBottom: tab === t.id ? '2px solid #00cfff' : '2px solid transparent',
              }}>
                {t.icon} {t.label}
                {t.count > 0 && <span style={{ marginLeft: 4, background: t.red ? '#ff3b3b' : '#1e3040', color: t.red ? '#fff' : '#4a6070', fontSize: 8, padding: '1px 4px', borderRadius: 2 }}>{t.count}</span>}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* DETECTIONS */}
            {tab === 'detections' && (
              detFeed.length === 0
                ? <div style={{ padding: 24, textAlign: 'center', fontSize: 10, color: '#1e3040' }}>
                  <div style={{ fontSize: 24, opacity: .2, marginBottom: 8 }}>📡</div>
                  WAITING FOR DETECTIONS
                  <div style={{ fontSize: 9, color: '#1a2a36', marginTop: 8, lineHeight: 1.8 }}>
                    {[...activeUCs].join(' + ')}
                  </div>
                </div>
                : detFeed.map((d, i) => (
                  <div key={d.id + i} style={{
                    padding: '8px 12px', borderBottom: '1px solid #060e18',
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    opacity: Math.max(0.3, 1 - i * 0.015),
                    background: d.crossed ? 'rgba(255,59,59,0.05)' : i === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: d.crossed ? '#ff3b3b' : d.color, boxShadow: `0 0 5px ${d.crossed ? '#ff3b3b' : d.color}` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 'bold', color: d.crossed ? '#ff6b6b' : d.color }}>
                          {d.label}{d.speedVal ? ` ${d.speedVal}km/h` : ''}{d.crossed ? ' ⚠' : ''}
                        </span>
                        <span style={{ fontSize: 9, color: '#1e3040' }}>{d.ts}</span>
                      </div>
                      <div style={{ fontSize: 9, color: '#2a4050', marginTop: 2, display: 'flex', gap: 8 }}>
                        <span>conf: <span style={{ color: '#4a6070' }}>{d.confidence}%</span></span>
                        <span style={{ color: d.color, opacity: 0.6 }}>{d.useCase}</span>
                        {d.hasBbox ? <span style={{ color: '#1e3040' }}>bbox ✓</span> : <span style={{ color: '#1a2a36' }}>no bbox</span>}
                      </div>
                      <div style={{ marginTop: 4, height: 2, background: '#0d1e2e', borderRadius: 1 }}>
                        <div style={{ height: '100%', width: `${Math.min(100, d.confidence)}%`, background: d.color, borderRadius: 1 }} />
                      </div>
                    </div>
                  </div>
                ))
            )}

            {/* CROSSINGS */}
            {tab === 'crossings' && (
              crossLog.length === 0
                ? <div style={{ padding: 24, textAlign: 'center', fontSize: 10, color: '#1e3040' }}>
                  <div style={{ fontSize: 24, opacity: .2, marginBottom: 8 }}>✏</div>
                  {countLine ? 'MONITORING — NO CROSSINGS YET' : 'DRAW A LINE ON CANVAS TO COUNT'}
                </div>
                : crossLog.map((c, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid #060e18', background: i === 0 ? 'rgba(255,59,59,0.06)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 'bold', color: '#ff6b6b' }}>{c.label}{c.speedVal ? ` • ${c.speedVal}km/h` : ''}</div>
                      <div style={{ fontSize: 9, color: '#2a4050', marginTop: 2 }}>conf: {c.confidence}%</div>
                    </div>
                    <span style={{ fontSize: 9, color: '#1e3040' }}>{c.ts}</span>
                  </div>
                ))
            )}

            {/* ALERTS */}
            {tab === 'alerts' && (
              alertLoad
                ? <div style={{ padding: 20, textAlign: 'center', fontSize: 10, color: '#2a4050' }}>LOADING ALERTS…</div>
                : alerts.length === 0
                  ? <div style={{ padding: 24, textAlign: 'center', fontSize: 10, color: '#1e3040' }}>
                    <div style={{ fontSize: 24, opacity: .2, marginBottom: 8 }}>🔔</div>
                    NO ALERTS FOR {primaryUC.toUpperCase()}
                  </div>
                  : alerts.map((a, i) => (
                    <div key={a.id} style={{
                      padding: '8px 12px', borderBottom: '1px solid #060e18',
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      opacity: a.acknowledged ? 0.35 : 1,
                      background: !a.acknowledged && i === 0 ? `${SEV_COLOR[a.severity]}08` : 'transparent',
                      transition: 'opacity 0.3s',
                    }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: SEV_COLOR[a.severity], boxShadow: !a.acknowledged ? `0 0 5px ${SEV_COLOR[a.severity]}` : 'none' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: a.acknowledged ? '#4a6070' : '#c8d8e8', lineHeight: 1.4 }}>{a.message}</div>
                        <div style={{ fontSize: 9, color: '#2a4050', marginTop: 3, display: 'flex', gap: 8 }}>
                          <span style={{ color: SEV_COLOR[a.severity] }}>{a.severity?.toUpperCase()}</span>
                          <span>{new Date(a.timestamp).toLocaleTimeString()}</span>
                          {a.acknowledged && <span style={{ color: '#1e3040' }}>ACK'd</span>}
                        </div>
                      </div>
                      {!a.acknowledged && (
                        <button onClick={() => ack(a.id)} style={{ background: 'transparent', border: '1px solid #0d2030', color: '#4a6070', padding: '2px 8px', fontSize: 8, letterSpacing: 1, flexShrink: 0, cursor: 'pointer' }}>
                          ACK
                        </button>
                      )}
                    </div>
                  ))
            )}
          </div>

          {/* Count line info */}
          {countLine && (
            <div style={{ padding: '10px 12px', borderTop: '1px solid #0d1e2e', background: 'rgba(0,255,136,0.03)', fontSize: 10, flexShrink: 0 }}>
              <div style={{ color: '#2a4050', letterSpacing: 2, marginBottom: 5 }}>COUNT LINE</div>
              <div style={{ color: '#4a6070', fontSize: 9 }}>A ({Math.round(countLine.x1)},{Math.round(countLine.y1)}) → B ({Math.round(countLine.x2)},{Math.round(countLine.y2)})</div>
              <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: '#4a6070' }}>TOTAL</span>
                <span style={{ color: '#ffd600', fontSize: 22, fontWeight: 'bold' }}>{lineCount}</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #0d1e2e', flexShrink: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              {[
                { l: 'ON CANVAS', v: detsRef.current.length, c: '#00cfff' },
                { l: 'TOTAL', v: totalDets, c: '#c8d8e8' },
                { l: 'CROSSINGS', v: lineCount, c: '#ffd600' },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ background: '#0a111e', padding: '6px 8px', textAlign: 'center' }}>
                  <div style={{ color: '#2a4050', letterSpacing: 1, fontSize: 8, marginBottom: 2 }}>{l}</div>
                  <div style={{ color: c, fontSize: 16, fontWeight: 'bold' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}