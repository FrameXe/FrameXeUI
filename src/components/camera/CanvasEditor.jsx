import { useState, useEffect, useRef, useCallback } from 'react'
import { attachHLS }    from '../../services/hls.js'
import { sseManager }   from '../../lib/sseManager.js'
import { drawDetBox, drawMockBg, crossesLine } from '../../services/canvasDraw.js'
import { UC_COLOR, UC_MAP, UC_CANVAS } from '../../constants/useCases.js'
import { useCameraAlerts }  from '../../hooks/useAlerts.js'
import { Btn, Tag, SEV_COLOR } from '../shared/index.jsx'
import { cameraAPI }    from '../../services/api.js'
import { useCrossStore } from '../../store/index.js'

const lineAPI = {
  get:  (camId) => fetch(`/api/line/config?cam_id=${camId}`).then(r => r.ok ? r.json() : null).catch(() => null),
  save: (body)  => fetch('/api/line/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json()),
  del:  (camId) => fetch(`/api/line/config?cam_id=${camId}`, { method: 'DELETE' }).then(r => r.json()).catch(() => null),
  recordCrossing: (body) => fetch('/api/line/crossing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.ok ? r.json() : null).catch(() => null),
}

// ── Draw Virtual Counting Line on canvas ──────────────────────
// Supports: draft (placing_p2), placed (draggable), saved
function drawVirtualLine(ctx, line, hoveredPt, draggingPt, mousePos, linePhase, direction) {
  const LINE_COLOR  = '#00D4FF'
  const PT_RADIUS   = 8
  const PT_HOVER_R  = 11

  // Draft: user placed P1, moving mouse toward P2
  if (linePhase === 'placing_p2' && line?.p1 && mousePos) {
    const { p1 } = line
    ctx.save()
    ctx.strokeStyle = `${LINE_COLOR}88`
    ctx.lineWidth   = 2
    ctx.setLineDash([10, 6])
    ctx.shadowColor = LINE_COLOR; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(mousePos.x, mousePos.y); ctx.stroke()
    ctx.setLineDash([])
    // P1 circle
    ctx.fillStyle = '#fff'; ctx.strokeStyle = LINE_COLOR; ctx.lineWidth = 2; ctx.shadowBlur = 12
    ctx.beginPath(); ctx.arc(p1.x, p1.y, PT_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.restore()
    return
  }

  // Fully placed or saved line
  if (!line?.p1 || !line?.p2) return
  const { p1, p2 } = line

  ctx.save()
  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth   = 3
  ctx.shadowColor = LINE_COLOR
  ctx.shadowBlur  = 16
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke()
  ctx.shadowBlur = 0

  // Endpoints
  ;[{ pt: p1, key: 'p1' }, { pt: p2, key: 'p2' }].forEach(({ pt, key }) => {
    const isHov = hoveredPt === key || draggingPt === key
    const r     = isHov ? PT_HOVER_R : PT_RADIUS
    ctx.save()
    if (isHov) { ctx.shadowColor = LINE_COLOR; ctx.shadowBlur = 20 }
    ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2)
    ctx.fillStyle   = isHov ? LINE_COLOR : '#fff'
    ctx.strokeStyle = LINE_COLOR; ctx.lineWidth = 2.5
    ctx.fill(); ctx.stroke()
    ctx.restore()
  })

  // Direction arrow + label at midpoint
  const mx  = (p1.x + p2.x) / 2
  const my  = (p1.y + p2.y) / 2
  const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x)
  const perp = ang + Math.PI / 2

  // Arrow shaft
  ctx.strokeStyle = LINE_COLOR; ctx.lineWidth = 2; ctx.shadowBlur = 0
  if (direction === 'both' || direction === 'in') {
    const ax = mx + Math.cos(perp) * 20, ay = my + Math.sin(perp) * 20
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(ax, ay)
    ctx.moveTo(ax, ay)
    ctx.lineTo(ax + Math.cos(perp + Math.PI * 0.8) * 8, ay + Math.sin(perp + Math.PI * 0.8) * 8)
    ctx.moveTo(ax, ay)
    ctx.lineTo(ax + Math.cos(perp - Math.PI * 0.8) * 8, ay + Math.sin(perp - Math.PI * 0.8) * 8)
    ctx.stroke()
  }
  if (direction === 'both' || direction === 'out') {
    const bx = mx + Math.cos(perp + Math.PI) * 20, by = my + Math.sin(perp + Math.PI) * 20
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(bx, by)
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + Math.cos(perp + Math.PI + Math.PI * 0.8) * 8, by + Math.sin(perp + Math.PI + Math.PI * 0.8) * 8)
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + Math.cos(perp + Math.PI - Math.PI * 0.8) * 8, by + Math.sin(perp + Math.PI - Math.PI * 0.8) * 8)
    ctx.stroke()
  }

  // Label badge
  const dirLabel = direction === 'both' ? '↕ BOTH' : direction === 'in' ? '↑ IN' : '↓ OUT'
  ctx.font = "bold 10px 'Courier New'"
  const tw = ctx.measureText(dirLabel).width
  const bx = mx - tw / 2 - 8, by = my - 30
  ctx.fillStyle = 'rgba(0,212,255,0.85)'
  ctx.beginPath()
  ctx.roundRect(bx, by, tw + 16, 18, 3)
  ctx.fill()
  ctx.fillStyle = '#000'
  ctx.fillText(dirLabel, bx + 8, by + 13)

  ctx.restore()
}

// ── Hit test: is mouse near endpoint? ────────────────────────
function hitTestEndpoint(pos, line) {
  if (!line?.p1 || !line?.p2 || !pos) return null
  if (Math.hypot(pos.x - line.p1.x, pos.y - line.p1.y) < 14) return 'p1'
  if (Math.hypot(pos.x - line.p2.x, pos.y - line.p2.y) < 14) return 'p2'
  return null
}

// ═════════════════════════════════════════════════════════════
const toBackend  = uc => uc === 'traffic' ? 'vehicle_count' : uc
const toFrontend = uc => uc === 'vehicle_count' ? 'traffic' : uc

export default function CanvasEditor({ camera, onClose }) {
  const canvasRef    = useRef(null)
  const videoRef     = useRef(null)
  const animRef      = useRef(null)
  const frameRef     = useRef(0)
  const detsRef      = useRef([])
  const countRef     = useRef(0)
  const crossedIds   = useRef(new Set())
  const hlsInstanceRef = useRef(null)
  const sseBufferRef   = useRef([])

  // All enabled usecases for this camera
  const allUsecases = camera.enabled_usecases || [camera.useCase] || []
  const [activeUCs, setActiveUCs] = useState(new Set(allUsecases))
  const toggleUC = (uc) => setActiveUCs(prev => {
    const next = new Set(prev)
    if (next.has(uc)) { if (next.size > 1) next.delete(uc) } else next.add(uc)
    return next
  })

  const [mode, setMode]           = useState('view')
  const [mousePos, setMousePos]   = useState(null)
  const [flashRed, setFlashRed]   = useState(false)
  const [crossLog, setCrossLog]   = useState([])
  const [detFeed, setDetFeed]     = useState([])
  const [tab, setTab]             = useState('detections')
  const [hlsReady, setHlsReady]   = useState(false)
  const [retryKey, setRetryKey]   = useState(0)
  const [totalDets, setTotalDets] = useState(0)
  const [lineCount, setLineCount] = useState(0)

  // ── Virtual Line State ────────────────────────────────────
  // linePhase: 'off' | 'placing_p1' | 'placing_p2' | 'placed' | 'saved'
  const [linePhase,    setLinePhase]    = useState('off')
  const [virtualLine,  setVirtualLine]  = useState(null)   // { p1:{x,y}, p2:{x,y} }
  const [lineDir,      setLineDir]      = useState('both') // 'both'|'in'|'out'
  const [hoveredPt,    setHoveredPt]    = useState(null)   // 'p1'|'p2'|null
  const draggingPtRef  = useRef(null)                      // use ref to avoid stale closure
  const [draggingPtSt, setDraggingPtSt] = useState(null)  // mirror for render deps
  const [lineSaving,   setLineSaving]   = useState(false)
  const [lineDeleting, setLineDeleting] = useState(false)
  const [lineMsg,      setLineMsg]      = useState(null)
  const virtualLineRef = useRef(null)   // mirror for render loop

  // Keep virtualLineRef in sync
  useEffect(() => { virtualLineRef.current = virtualLine }, [virtualLine])

  // ── ROI / Polygon Zone State ──────────────────────────────
  const [zonePoints, setZonePoints] = useState([])
  const [zoneDraft,  setZoneDraft]  = useState([])
  const [roiSaving,  setRoiSaving]  = useState(false)
  const [roiMsg,     setRoiMsg]     = useState(null)

  const isMp4 = !!(camera.hlsUrl && camera.hlsUrl.match(/\.mp4(\?|$)/i))
  const primaryUC = [...activeUCs][0] || allUsecases[0] || 'people_count'
  const { alerts, loading: alertLoad, ack } = useCameraAlerts(camera.id, primaryUC)
  const unackedCount = alerts.filter(a => !a.acknowledged).length

  // ── Load ROI on mount ─────────────────────────────────────
  useEffect(() => {
    cameraAPI.getROI(camera.id)
      .then(data => {
        if (data?.roi_area?.length >= 3) {
          setZonePoints(data.roi_area.map(p => ({ x: p.x * 1280, y: p.y * 720 })))
        }
      }).catch(() => {})
  }, [camera.id])

  // ── Load Line Config on mount ─────────────────────────────
  useEffect(() => {
    lineAPI.get(camera.id).then(cfg => {
      if (cfg?.enabled && cfg.x1_ratio != null) {
        const W = 1280, H = 720
        const line = {
          p1: { x: cfg.x1_ratio * W, y: cfg.y1_ratio * H },
          p2: { x: cfg.x2_ratio * W, y: cfg.y2_ratio * H },
        }
        setVirtualLine(line)
        setLineDir(cfg.direction || 'both')
        setLinePhase('saved')
      }
    })
  }, [camera.id])

  // ── HLS setup ─────────────────────────────────────────────
  useEffect(() => {
    if (!camera.hlsUrl) return
    const vid = videoRef.current
    let inst  = null
    if (isMp4) {
      vid.src = camera.hlsUrl; vid.loop = true; vid.muted = true; vid.preload = 'auto'
      vid.play().catch(() => {})
      const t = setInterval(() => { if (vid.readyState >= 1) { setHlsReady(true); clearInterval(t) } }, 200)
      return () => { clearInterval(t); vid.pause(); vid.src = ''; setHlsReady(false) }
    }

    let retryTimeout = null
    const onError = () => {
      setHlsReady(false)
      if (!retryTimeout) {
        retryTimeout = setTimeout(() => {
          setRetryKey(k => k + 1)
        }, 3000)
      }
    }
    vid.addEventListener('error', onError)

    attachHLS(vid, camera.hlsUrl).then(h => {
      inst = h
      hlsInstanceRef.current = h
      const t = setInterval(() => {
        if (vid.readyState >= 1) {
          setHlsReady(true)
          clearInterval(t)
        }
      }, 400)
    })

    // Watchdog
    const watchdog = setTimeout(() => {
      if (vid.readyState < 1) {
        console.log('[HLS Watchdog] Editor Stream not ready after 8s, retrying...', camera.camera_id)
        setRetryKey(k => k + 1)
      }
    }, 8000)

    return () => {
      clearTimeout(watchdog)
      clearTimeout(retryTimeout)
      vid.removeEventListener('error', onError)
      inst?.destroy()
      hlsInstanceRef.current = null
      setHlsReady(false)
    }
  }, [camera.hlsUrl, isMp4, retryKey])

  // ── Detection feed via SSE ────────────────────────────────
  useEffect(() => {
    detsRef.current = []
    setDetFeed([])
    setTotalDets(0)
    const ucArray = [...activeUCs]
    if (ucArray.length === 0 || !camera.id) return


    const seenUrls = new Set()
    const uniqueUcs = ucArray.filter(uc => {
      const url = `/api/sse/cameras/${camera.id}/detections/${toBackend(uc)}`
      if (seenUrls.has(url)) return false
      seenUrls.add(url); return true
    })

    const handlePayload = (payload, frontendUc) => {
      const ucKey   = toFrontend(frontendUc)
      const objects = Array.isArray(payload) ? payload : (payload?.objects ?? payload?.detections ?? [])
      const payloadUc = payload?.usecase ? toFrontend(payload.usecase) : ucKey
      const color   = UC_CANVAS[ucKey]?.color || UC_CANVAS[payloadUc]?.color || '#00cfff'

      // Build incoming detections
      const incoming = objects.map(obj => {
        const bbox = obj.bbox || {}
        const x = bbox.x ?? obj.x ?? 0, y = bbox.y ?? obj.y ?? 0
        const w = bbox.width ?? bbox.w ?? obj.width ?? obj.w ?? 0
        const h = bbox.height ?? bbox.h ?? obj.height ?? obj.h ?? 0
        const conf = obj.confidence ?? 0
        const confPct = conf > 1 ? Number(conf).toFixed(1) : (conf * 100).toFixed(1)
        return {
          id:         obj.id ? `${ucKey}-${obj.id}` : `${ucKey}-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
          useCase:    ucKey, color,
          label:      obj.label || UC_CANVAS[ucKey]?.label || ucKey,
          confidence: confPct,
          x, y, w, h,
          hasBbox:    w > 0 && h > 0,
          speedVal:   obj.speed ?? null, age: 0, alpha: 1,
          plate:      obj.plate || obj.number_plate || null,
        }
      })

      const sseTimeMs = (payload.timestamp || (Date.now() / 1000)) * 1000
      sseBufferRef.current.push({
        timestamp: sseTimeMs,
        receivedAt: Date.now(),
        objects: incoming,
        useCase: ucKey
      })

      // Keep last 20 seconds of received payloads
      const cutoff = Date.now() - 20000
      sseBufferRef.current = sseBufferRef.current.filter(item => item.receivedAt > cutoff)

      if (incoming.length > 0) {
        setDetFeed(prev => {
          const existingIds = new Set(prev.slice(0, 20).map(d => d.id))
          const fresh = incoming.filter(d => !existingIds.has(d.id))
          if (fresh.length === 0) return prev
          setTotalDets(n => n + fresh.length)

          const formatTime = (tsSec) => {
            const date = tsSec ? new Date(tsSec * 1000) : new Date();
            const pad = (num) => String(num).padStart(2, '0');
            const ms = String(date.getMilliseconds()).padStart(3, '0');
            return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
          };
          const tsString = formatTime(payload?.timestamp);

          return [...fresh.map(d => ({ ...d, ts: tsString })), ...prev].slice(0, 80)
        })
      }
    }

    const unsubs = uniqueUcs.map(frontendUc => {
      const backendUc = toBackend(frontendUc)
      const url = `/api/sse/cameras/${camera.id}/detections/${backendUc}`
      const cb  = data => handlePayload(data, frontendUc)
      const u1  = sseManager.subscribe(url, backendUc,   cb)
      const u2  = sseManager.subscribe(url, 'detection', cb)
      const u3  = sseManager.subscribe(url, 'message',   cb)
      return () => { u1(); u2(); u3() }
    })
    return () => unsubs.forEach(fn => fn())
  }, [camera.id, activeUCs])



  // ── Draw polygon zone ─────────────────────────────────────
  const drawZone = useCallback((ctx, points, draft, cursorPos) => {
    if (points.length >= 2) {
      ctx.save()
      ctx.strokeStyle = '#00cfff'; ctx.lineWidth = 2
      ctx.shadowColor = '#00cfff'; ctx.shadowBlur = 10; ctx.setLineDash([])
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y)
      points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath()
      ctx.fillStyle = 'rgba(0,207,255,0.10)'; ctx.fill(); ctx.stroke()
      points.forEach(p => {
        ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 6
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill()
      })
      ctx.restore()
    }
    if (draft.length > 0 && cursorPos) {
      ctx.save()
      ctx.strokeStyle = '#ffd600'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 5])
      ctx.shadowColor = '#ffd600'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.moveTo(draft[0].x, draft[0].y)
      draft.forEach(p => ctx.lineTo(p.x, p.y)); ctx.lineTo(cursorPos.x, cursorPos.y); ctx.stroke()
      draft.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? '#00ff88' : '#ffd600'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 4
        ctx.beginPath(); ctx.arc(p.x, p.y, i === 0 ? 7 : 4, 0, Math.PI * 2); ctx.fill()
      })
      ctx.restore()
    }
  }, [])

  // ── Render loop ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    let running = true
    const render = () => {
      if (!running) return
      frameRef.current++
      const W = canvas.width, H = canvas.height
      const vid = videoRef.current
      if (camera.hlsUrl && vid?.readyState >= 1) {
        try { ctx.drawImage(vid, 0, 0, W, H) } catch(e) {}
        ctx.fillStyle = 'rgba(0,0,0,0.025)'
        for (let y = (frameRef.current * 2) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1)
      } else {
        drawMockBg(ctx, W, H, frameRef.current, camera.name)
      }
      const origW = (camera.hlsUrl && vid?.videoWidth) ? vid.videoWidth : 1280
      const origH = (camera.hlsUrl && vid?.videoHeight) ? vid.videoHeight : 720

      // ── DIRECT TIMESTAMP SYNC ──
      // Backend (WSL2/Docker) and browser share the same system clock.
      // So we directly compare: payload.timestamp (Unix epoch ms) vs current video frame time.
      // Current video frame was live at: Date.now() - hls.latency
      const activeUCList = [...activeUCs].map(toFrontend)
      let targetObjects = []

      const hlsInst = hlsInstanceRef.current
      const hlsLatencyMs = hlsInst ? (hlsInst.latency ?? 0) * 1000 : 0
      const videoFrameTs = Date.now() - hlsLatencyMs // ms: what time was the current video frame live?

      activeUCList.forEach(ucKey => {
        const ucBuffer = sseBufferRef.current.filter(item => item.useCase === ucKey)
        if (ucBuffer.length === 0) return

        // Find detection whose backend frame timestamp is closest to current video frame time
        const closestPayload = ucBuffer.reduce((prev, curr) =>
          Math.abs(curr.timestamp - videoFrameTs) < Math.abs(prev.timestamp - videoFrameTs) ? curr : prev
        )

        targetObjects.push(...closestPayload.objects)
      })

      // ── LERP merge: targetObjects ko detsRef ke saath merge karo ──
      const incomingIds = new Set(targetObjects.map(i => i.id))
      const existingMap = new Map(detsRef.current.map(d => [d.id, d]))

      const merged = targetObjects.map(inc => {
        const ex = existingMap.get(inc.id)
        if (ex) {
          return {
            ...ex,
            targetX: inc.x, targetY: inc.y, targetW: inc.w, targetH: inc.h,
            targetGone: false,
            confidence: inc.confidence,
            speedVal:   inc.speedVal ?? ex.speedVal,
            label:      inc.label,
            age:        0,
            alpha:      1,
          }
        }
        return { ...inc, targetX: inc.x, targetY: inc.y, targetW: inc.w, targetH: inc.h, targetGone: false, age: 0, alpha: 1 }
      })

      const otherUC = detsRef.current.filter(d => !activeUCList.includes(d.useCase))
      detsRef.current = [...otherUC, ...merged]

      // ── Phase-1 LERP: slide current coords toward target every frame ──
      const LERP = 0.18
      detsRef.current = detsRef.current
        .map(d => {
          const tx = d.targetX ?? d.x, ty = d.targetY ?? d.y
          const tw = d.targetW ?? d.w, th = d.targetH ?? d.h
          const nx = d.x + (tx - d.x) * LERP
          const ny = d.y + (ty - d.y) * LERP
          const nw = d.w + (tw - d.w) * LERP
          const nh = d.h + (th - d.h) * LERP
          return { ...d, x: nx, y: ny, w: nw, h: nh, alpha: 1 }
        })
      detsRef.current.forEach(d => drawDetBox(ctx, d, W, H, origW, origH))

      // ── Crossing check (virtual line) ──
      const line = virtualLineRef.current
      if (line?.p1 && line?.p2) {
        const lineForCross = { x1: line.p1.x, y1: line.p1.y, x2: line.p2.x, y2: line.p2.y }
        let hit = false
        detsRef.current.forEach(det => {
          if (!det.hasBbox || crossedIds.current.has(det.id)) return
          if (crossesLine(det, lineForCross, W, H)) {
            crossedIds.current.add(det.id)
            det.crossed = true
            countRef.current++
            hit = true
            const pad = (num) => String(num).padStart(2, '0')
            const now = new Date()
            const ms = String(now.getMilliseconds()).padStart(3, '0')
            const nowMs = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${ms}`

            // ── Direction detection: which side of line is the detection on? ──
            // Line normal vector (perpendicular): dx = -(y2-y1), dy = (x2-x1)
            const lx1 = line.p1.x / W * origW, ly1 = line.p1.y / H * origH
            const lx2 = line.p2.x / W * origW, ly2 = line.p2.y / H * origH
            const nx = -(ly2 - ly1), ny = (lx2 - lx1) // normal
            const cx = det.x + det.w / 2, cy = det.y + det.h / 2
            const dot = (cx - lx1) * nx + (cy - ly1) * ny
            // dot > 0 means detection center is on the "right" side of the line = IN
            const crossDir = dot > 0 ? 'in' : 'out'

            setCrossLog(p => [{ label: det.label, confidence: det.confidence, speedVal: det.speedVal, ts: det.ts || nowMs, dir: crossDir }, ...p.slice(0, 99)])
            // Update per-camera crossing counts in store
            useCrossStore.getState().addCrossing(camera.id, crossDir)
            // Persist the crossing event to the backend database
            lineAPI.recordCrossing({
              cam_id: camera.id || camera.camera_id,
              direction: crossDir,
              label: det.label,
              count: 1
            })
          }
        })
        if (hit) {
          setLineCount(countRef.current)
          setFlashRed(true)
          setTimeout(() => setFlashRed(false), 400)
        }
      }

      // Virtual counting line
      drawVirtualLine(ctx, virtualLineRef.current, hoveredPt, draggingPtSt, mousePos, linePhase, lineDir)

      // ROI zone on top
      drawZone(ctx, zonePoints, zoneDraft, mode === 'draw_zone' ? mousePos : null)
      if (flashRed) { ctx.fillStyle = 'rgba(255,0,0,0.1)'; ctx.fillRect(0, 0, W, H) }

      // OSD
      ctx.font = "11px 'Courier New'"; ctx.fillStyle = '#00cfff77'
      ctx.fillText(`${camera.name.toUpperCase()} | ${[...activeUCs].join(' + ').toUpperCase()}`, 12, 20)
      ctx.font = "9px 'Courier New'"; ctx.fillStyle = 'rgba(255,255,255,0.25)'
      const ucLabels = [...activeUCs].map(uc => (UC_CANVAS[uc]?.label || uc).toUpperCase()).join(' · ')
      ctx.fillText(ucLabels, 12, 34)
      if (zonePoints.length >= 3) { ctx.font = "9px 'Courier New'"; ctx.fillStyle = '#00cfff99'; ctx.fillText('● DETECTION ZONE ACTIVE', 12, 50) }
      if (linePhase === 'placed' || linePhase === 'saved') {
        ctx.font = "9px 'Courier New'"; ctx.fillStyle = '#00D4FF99'
        ctx.fillText(`✦ COUNT LINE ACTIVE  CROSSINGS: ${lineCount}`, 12, linePhase === 'placed' || zonePoints.length >= 3 ? 66 : 50)
      }

      animRef.current = requestAnimationFrame(render)
    }
    animRef.current = requestAnimationFrame(render)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [camera, flashRed, activeUCs, zonePoints, zoneDraft, mode, drawZone, hoveredPt, draggingPtSt, mousePos, linePhase, lineDir, lineCount])

  // ── Mouse / Canvas interaction ────────────────────────────
  const getPos = useCallback((e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (canvasRef.current.width / r.width), y: (e.clientY - r.top) * (canvasRef.current.height / r.height) }
  }, [])

  const onMouseDown = useCallback((e) => {
    const pos = getPos(e)

    // Line endpoint drag
    if ((linePhase === 'placed' || linePhase === 'saved') && virtualLineRef.current) {
      const hit = hitTestEndpoint(pos, virtualLineRef.current)
      if (hit) { draggingPtRef.current = hit; setDraggingPtSt(hit); return }
    }

    // Zone drawing
    if (mode === 'draw_zone') return
  }, [linePhase, mode, getPos])

  const onMouseMove = useCallback((e) => {
    const pos = getPos(e)
    setMousePos(pos)

    // Drag endpoint
    if (draggingPtRef.current && virtualLineRef.current) {
      setVirtualLine(prev => ({
        ...prev,
        [draggingPtRef.current]: pos,
      }))
      return
    }

    // Hover detection for endpoints
    if ((linePhase === 'placed' || linePhase === 'saved') && virtualLineRef.current) {
      setHoveredPt(hitTestEndpoint(pos, virtualLineRef.current))
    }
  }, [getPos, linePhase])

  const onMouseUp = useCallback(() => {
    if (draggingPtRef.current) {
      draggingPtRef.current = null
      setDraggingPtSt(null)
      // If line was saved, mark as modified (placed) so user can re-save
      if (linePhase === 'saved') setLinePhase('placed')
    }
  }, [linePhase])

  // ── Canvas click handler ──────────────────────────────────
  const onCanvasClick = useCallback((e) => {
    const pos = getPos(e)

    // Line: place P1
    if (linePhase === 'placing_p1') {
      setVirtualLine({ p1: pos, p2: null })
      setLinePhase('placing_p2')
      return
    }

    // Line: place P2
    if (linePhase === 'placing_p2') {
      if (Math.hypot(pos.x - (virtualLine?.p1?.x ?? 0), pos.y - (virtualLine?.p1?.y ?? 0)) < 20) return // too close
      setVirtualLine(prev => ({ ...prev, p2: pos }))
      setLinePhase('placed')
      setLineMsg(null)
      return
    }

    // Zone drawing
    if (mode === 'draw_zone') {
      setZoneDraft(prev => {
        if (prev.length >= 3) {
          const first = prev[0]
          if (Math.hypot(pos.x - first.x, pos.y - first.y) < 15) {
            setZonePoints(prev); setMode('view'); return []
          }
        }
        return [...prev, pos]
      })
    }
  }, [linePhase, virtualLine, mode, getPos])

  const onDblClick = useCallback((e) => {
    if (mode !== 'draw_zone') return
    setZoneDraft(prev => {
      if (prev.length >= 3) { setZonePoints(prev); setMode('view') }
      return []
    })
  }, [mode])

  // ── Line controls ─────────────────────────────────────────
  const startDrawLine = () => {
    setLinePhase('placing_p1')
    setVirtualLine(null)
    setLineMsg(null)
    countRef.current = 0
    crossedIds.current = new Set()
    setLineCount(0)
    setCrossLog([])
  }

  const clearLine = () => {
    setLinePhase('off')
    setVirtualLine(null)
    setHoveredPt(null)
    countRef.current = 0
    crossedIds.current = new Set()
    setLineCount(0)
    setCrossLog([])
    setLineMsg(null)
  }

  const saveLine = async () => {
    if (!virtualLine?.p1 || !virtualLine?.p2) return
    setLineSaving(true); setLineMsg(null)
    try {
      const W = canvasRef.current?.width  || 1280
      const H = canvasRef.current?.height || 720
      await lineAPI.save({
        cam_id:    camera.id,
        enabled:   true,
        x1_ratio:  parseFloat((virtualLine.p1.x / W).toFixed(4)),
        y1_ratio:  parseFloat((virtualLine.p1.y / H).toFixed(4)),
        x2_ratio:  parseFloat((virtualLine.p2.x / W).toFixed(4)),
        y2_ratio:  parseFloat((virtualLine.p2.y / H).toFixed(4)),
        direction: lineDir,
      })
      setLinePhase('saved')
      setLineMsg({ ok: true, text: '✓ Line saved & backend notified' })
      setTimeout(() => setLineMsg(null), 3000)
    } catch (err) {
      setLineMsg({ ok: false, text: '✗ Save failed: ' + err.message })
    } finally { setLineSaving(false) }
  }

  const deleteLine = async () => {
    setLineDeleting(true)
    try {
      await lineAPI.del(camera.id)
      clearLine()
      setLineMsg({ ok: true, text: '✓ Line deleted' })
      setTimeout(() => setLineMsg(null), 2000)
    } catch(err) {
      setLineMsg({ ok: false, text: '✗ ' + err.message })
    } finally { setLineDeleting(false) }
  }

  // ── Zone controls ─────────────────────────────────────────
  const clearZone = () => { setZonePoints([]); setZoneDraft([]); setRoiMsg(null) }
  const saveROI = async () => {
    if (zonePoints.length < 3) return
    setRoiSaving(true); setRoiMsg(null)
    try {
      const normalized = zonePoints.map(p => ({ x: parseFloat((p.x / 1280).toFixed(4)), y: parseFloat((p.y / 720).toFixed(4)) }))
      await cameraAPI.saveROI(camera.id, normalized)
      setRoiMsg({ ok: true, text: 'Zone saved!' })
    } catch (err) {
      setRoiMsg({ ok: false, text: 'Save failed: ' + err.message })
    } finally { setRoiSaving(false) }
  }

  // ── Cursor style ──────────────────────────────────────────
  const getCursor = () => {
    if (draggingPtSt)                         return 'grabbing'
    if (hoveredPt)                            return 'grab'
    if (linePhase === 'placing_p1' || linePhase === 'placing_p2') return 'crosshair'
    if (mode === 'draw_zone')                 return 'cell'
    return 'default'
  }

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04080f', display: 'flex', flexDirection: 'column', fontFamily: "'Courier New',monospace", color: '#c8d8e8', zIndex: 1000 }}>
      <video ref={videoRef} style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0.001, pointerEvents: 'none', overflow: 'hidden' }} muted playsInline autoPlay preload="auto" />

      {/* ── TOOLBAR ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid #0d1e2e', background: '#060d18', flexShrink: 0, flexWrap: 'wrap', rowGap: 6 }}>
        <Btn onClick={onClose}>← BACK</Btn>
        <span style={{ fontWeight: 'bold', fontSize: 13, letterSpacing: 1 }}>{camera.name.toUpperCase()}</span>
        <span style={{ fontSize: 10, color: '#2a4050' }}>{camera.location}</span>

        {/* Usecase pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
          {allUsecases.map(uc => {
            const on    = activeUCs.has(uc)
            const color = UC_COLOR[uc] || '#00cfff'
            return (
              <button key={uc} onClick={() => toggleUC(uc)} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', fontSize: 9, letterSpacing: 1, cursor: 'pointer',
                background: on ? `${color}22` : 'transparent',
                border: `1px solid ${on ? color + '88' : '#1e3040'}`,
                color: on ? color : '#4a6070', borderRadius: 3, transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 11 }}>{UC_MAP[uc]?.emoji || '◈'}</span>
                <span>{UC_MAP[uc]?.label || uc}</span>
                {on && <span style={{ fontSize: 8, marginLeft: 2 }}>●</span>}
              </button>
            )
          })}
        </div>

        {camera.hlsUrl
          ? <Tag color={hlsReady ? '#00cfff' : '#ffd600'}>{hlsReady ? '● LIVE' : '◌ LOADING…'}</Tag>
          : <Tag color='#2a4050'>NO SOURCE</Tag>}
        {unackedCount > 0 && <Tag color='#ff3b3b'>⚠ {unackedCount} ALERTS</Tag>}


        <div style={{ flex: 1 }} />

        {/* ── Virtual Line Controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderRight: '1px solid #0d1e2e', paddingRight: 12 }}>
          <span style={{ fontSize: 9, color: '#4a6070', letterSpacing: 1 }}>COUNT LINE</span>

          {/* OFF state */}
          {linePhase === 'off' && (
            <Btn color='#00D4FF' onClick={startDrawLine}>
              ✦ DRAW LINE
            </Btn>
          )}

          {/* Placing P1 */}
          {linePhase === 'placing_p1' && (
            <span style={{ fontSize: 9, color: '#00D4FF', animation: 'pulse 1s infinite' }}>
              CLICK TO SET START POINT
            </span>
          )}

          {/* Placing P2 */}
          {linePhase === 'placing_p2' && (
            <span style={{ fontSize: 9, color: '#00D4FF' }}>
              CLICK TO SET END POINT
            </span>
          )}

          {/* Placed or Saved */}
          {(linePhase === 'placed' || linePhase === 'saved') && (
            <>
              {/* Direction selector */}
              <div style={{ display: 'flex', gap: 2 }}>
                {[['both', '↕'], ['in', '↑'], ['out', '↓']].map(([val, icon]) => (
                  <button key={val} onClick={() => { setLineDir(val); if (linePhase === 'saved') setLinePhase('placed') }} style={{
                    padding: '2px 7px', fontSize: 10, cursor: 'pointer', borderRadius: 3,
                    background: lineDir === val ? '#00D4FF22' : 'transparent',
                    border: `1px solid ${lineDir === val ? '#00D4FF88' : '#1e3040'}`,
                    color: lineDir === val ? '#00D4FF' : '#4a6070',
                  }}>{icon}</button>
                ))}
              </div>

              {/* Crossings badge */}
              <div style={{ fontSize: 10, color: '#00D4FF', background: 'rgba(0,212,255,0.08)', border: '1px solid #00D4FF30', padding: '3px 10px', letterSpacing: 1 }}>
                CROSS: <b>{lineCount}</b>
              </div>

              {/* Save (only if not saved yet or modified) */}
              {linePhase === 'placed' && (
                <Btn color='#00ff88' onClick={saveLine} style={{ opacity: lineSaving ? 0.5 : 1 }}>
                  {lineSaving ? '⏳…' : '💾 SAVE'}
                </Btn>
              )}
              {linePhase === 'saved' && (
                <span style={{ fontSize: 9, color: '#00ff88', letterSpacing: 1 }}>✓ SAVED</span>
              )}

              <Btn color='#ff6b6b' onClick={() => { linePhase === 'saved' ? deleteLine() : clearLine() }}>
                {lineDeleting ? '…' : '✕'}
              </Btn>
            </>
          )}

          {lineMsg && (
            <span style={{ fontSize: 9, letterSpacing: 1, color: lineMsg.ok ? '#00ff88' : '#ff6b6b', maxWidth: 160 }}>
              {lineMsg.text}
            </span>
          )}
        </div>

        {/* ── ROI Zone Controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: '#4a6070', letterSpacing: 1 }}>DETECT ZONE</span>
          <Btn
            active={mode === 'draw_zone'}
            color='#00cfff'
            onClick={() => {
              if (mode === 'draw_zone') { setMode('view'); setZoneDraft([]) }
              else { setMode('draw_zone'); setZoneDraft([]) }
            }}
          >
            {mode === 'draw_zone' ? '⬡ DRAWING…' : '⬡ ZONE'}
          </Btn>
          {zonePoints.length >= 3 && (
            <>
              <Btn color='#00ff88' onClick={saveROI} style={{ opacity: roiSaving ? 0.5 : 1 }}>
                {roiSaving ? '⏳…' : '💾 SAVE'}
              </Btn>
              <Btn color='#ff6b6b' onClick={clearZone}>✕</Btn>
            </>
          )}
          {roiMsg && (
            <span style={{ fontSize: 9, letterSpacing: 1, color: roiMsg.ok ? '#00ff88' : '#ff6b6b' }}>
              {roiMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', background: '#000' }}>
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onClick={onCanvasClick}
            onDoubleClick={onDblClick}
            style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1, cursor: getCursor() }}
          />

          {/* Canvas hints */}
          {linePhase === 'placing_p1' && (
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,212,255,0.12)', border: '1px solid #00D4FF44', color: '#00D4FF', padding: '6px 22px', fontSize: 11, letterSpacing: 2, pointerEvents: 'none' }}>
              CLICK TO SET START POINT OF COUNT LINE
            </div>
          )}
          {linePhase === 'placing_p2' && (
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,212,255,0.12)', border: '1px solid #00D4FF44', color: '#00D4FF', padding: '6px 22px', fontSize: 11, letterSpacing: 2, pointerEvents: 'none' }}>
              CLICK TO SET END POINT · ESC TO CANCEL
            </div>
          )}
          {(linePhase === 'placed' || linePhase === 'saved') && hoveredPt && (
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,212,255,0.12)', border: '1px solid #00D4FF33', color: '#00D4FF88', padding: '4px 16px', fontSize: 10, letterSpacing: 1, pointerEvents: 'none' }}>
              DRAG TO ADJUST ENDPOINT
            </div>
          )}
          {mode === 'draw_zone' && (
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,207,255,0.10)', border: '1px solid #00cfff44', color: '#00cfff', padding: '6px 22px', fontSize: 11, letterSpacing: 2, pointerEvents: 'none', textAlign: 'center' }}>
              {zoneDraft.length === 0 ? 'CLICK TO START DRAWING ZONE'
                : zoneDraft.length < 3 ? `${zoneDraft.length} POINT${zoneDraft.length > 1 ? 'S' : ''} — ADD MORE (MIN 3)`
                : 'CLICK FIRST POINT TO CLOSE · DOUBLE-CLICK TO FINISH'}
            </div>
          )}
          {flashRed && <div style={{ position: 'absolute', inset: 0, border: '3px solid #ff3b3b', boxShadow: 'inset 0 0 40px rgba(255,0,0,0.2)', pointerEvents: 'none' }} />}
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────── */}
        <div style={{ width: 290, borderLeft: '1px solid #0d1e2e', background: '#060d18', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #0d1e2e', flexShrink: 0 }}>
            {[
              { id: 'detections', icon: '◈', label: 'DETECTED',  count: detFeed.length,  red: false },
              { id: 'crossings',  icon: '✦', label: 'CROSSINGS', count: crossLog.length,  red: crossLog.length > 0 },
              { id: 'alerts',     icon: '⚠', label: 'ALERTS',    count: unackedCount,     red: unackedCount > 0 },
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

            {/* DETECTIONS tab */}
            {tab === 'detections' && (
              detFeed.length === 0
                ? <div style={{ padding: 24, textAlign: 'center', fontSize: 10, color: '#1e3040' }}>
                    <div style={{ fontSize: 24, opacity: .2, marginBottom: 8 }}>📡</div>
                    WAITING FOR DETECTIONS
                    <div style={{ fontSize: 9, color: '#1a2a36', marginTop: 8, lineHeight: 1.8 }}>{[...activeUCs].join(' + ')}</div>
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
                      </div>
                      <div style={{ marginTop: 4, height: 2, background: '#0d1e2e', borderRadius: 1 }}>
                        <div style={{ height: '100%', width: `${Math.min(100, d.confidence)}%`, background: d.color, borderRadius: 1 }} />
                      </div>
                    </div>
                  </div>
                ))
            )}

            {/* CROSSINGS tab */}
            {tab === 'crossings' && (
              crossLog.length === 0
                ? <div style={{ padding: 24, textAlign: 'center', fontSize: 10, color: '#1e3040' }}>
                    <div style={{ fontSize: 24, opacity: .2, marginBottom: 8 }}>✦</div>
                    {(linePhase === 'placed' || linePhase === 'saved')
                      ? 'LINE ACTIVE — NO CROSSINGS YET'
                      : 'DRAW A COUNT LINE TO MONITOR CROSSINGS'}
                  </div>
                : crossLog.map((c, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid #060e18', background: i === 0 ? 'rgba(0,212,255,0.06)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 'bold', color: '#00D4FF' }}>{c.label}{c.speedVal ? ` • ${c.speedVal}km/h` : ''}</div>
                      <div style={{ fontSize: 9, color: '#2a4050', marginTop: 2 }}>conf: {c.confidence}%</div>
                    </div>
                    <span style={{ fontSize: 9, color: '#1e3040' }}>{c.ts}</span>
                  </div>
                ))
            )}

            {/* ALERTS tab */}
            {tab === 'alerts' && (
              alertLoad
                ? <div style={{ padding: 20, textAlign: 'center', fontSize: 10, color: '#2a4050' }}>LOADING ALERTS…</div>
                : alerts.length === 0
                  ? <div style={{ padding: 24, textAlign: 'center', fontSize: 10, color: '#1e3040' }}>
                      <div style={{ fontSize: 24, opacity: .2, marginBottom: 8 }}>🔔</div>
                      NO ALERTS FOR {primaryUC.toUpperCase()}
                    </div>
                  : alerts.map((a, i) => (
                    <div key={a.id} style={{ padding: '8px 12px', borderBottom: '1px solid #060e18', display: 'flex', gap: 8, alignItems: 'flex-start', opacity: a.acknowledged ? 0.35 : 1, background: !a.acknowledged && i === 0 ? `${SEV_COLOR[a.severity]}08` : 'transparent', transition: 'opacity 0.3s' }}>
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

          {/* Line info panel */}
          {(linePhase === 'placed' || linePhase === 'saved') && virtualLine?.p1 && virtualLine?.p2 && (
            <div style={{ padding: '10px 12px', borderTop: '1px solid #0d1e2e', background: 'rgba(0,212,255,0.03)', fontSize: 10, flexShrink: 0 }}>
              <div style={{ color: '#00D4FF', letterSpacing: 2, marginBottom: 4, fontSize: 9, display: 'flex', justifyContent: 'space-between' }}>
                <span>COUNT LINE</span>
                <span style={{ color: linePhase === 'saved' ? '#00ff88' : '#ffd600' }}>{linePhase === 'saved' ? '● SAVED' : '○ UNSAVED'}</span>
              </div>
              <div style={{ color: '#2a4050', fontSize: 9 }}>
                P1 ({Math.round(virtualLine.p1.x)}, {Math.round(virtualLine.p1.y)}) → P2 ({Math.round(virtualLine.p2.x)}, {Math.round(virtualLine.p2.y)})
              </div>
              <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: '#4a6070' }}>DIR: {lineDir.toUpperCase()}</span>
                <span style={{ color: '#00D4FF', fontSize: 22, fontWeight: 'bold' }}>{lineCount}</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #0d1e2e', flexShrink: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              {[
                { l: 'ON CANVAS', v: detsRef.current.length, c: '#00cfff' },
                { l: 'TOTAL',     v: totalDets,              c: '#c8d8e8' },
                { l: 'CROSSINGS', v: lineCount,              c: '#00D4FF' },
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