import { useEffect, useRef } from 'react'
import { attachHLS } from '../../services/hls.js'
import { sseManager } from '../../lib/sseManager.js'
import { drawDetBox, drawMockBg } from '../../services/canvasDraw.js'
import { UC_COLOR } from '../../constants/useCases.js'

const ST = {
  active:   { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Active' },
  inactive: { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Offline' },
  error:    { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Error' },
  offline:  { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Offline' },
}

export default function MiniCanvas({ camera, onClick, onDoubleClick }) {
  const canvasRef = useRef(null)
  const videoRef  = useRef(null)
  const animRef   = useRef(null)
  const frameRef  = useRef(0)
  const detsRef   = useRef([])

  const isActive = camera.status === 'active'
  const ucColor  = UC_COLOR[camera.useCase] || '#2563eb'
  const st       = ST[camera.status] || ST.inactive

  // HLS attach
  useEffect(() => {
    if (!camera.hlsUrl) return
    let hlsInst = null
    attachHLS(videoRef.current, camera.hlsUrl).then(h => { hlsInst = h })
    return () => hlsInst?.destroy()
  }, [camera.hlsUrl])

  // Detection feed via SSE
  // Endpoint: /api/sse/cameras/{id}/detections/{usecase}
  // Payload : { camera_id, usecase, objects:[{id,label,bbox:{x,y,width,height},confidence}] }
  useEffect(() => {
    if (!isActive || !camera.id || !camera.useCase) return
    detsRef.current = []

    // 'traffic' on frontend === 'vehicle_count' on backend
    const frontendUc = camera.useCase === 'vehicle_count' ? 'traffic' : camera.useCase
    const backendUc  = camera.useCase === 'traffic' ? 'vehicle_count' : camera.useCase
    const url   = `/api/sse/cameras/${camera.id}/detections/${backendUc}`
    const color = UC_COLOR[frontendUc] || UC_COLOR[camera.useCase] || '#2563eb'

    const handlePayload = (payload) => {
      const objects = Array.isArray(payload)
        ? payload
        : (payload?.objects ?? payload?.detections ?? [])

      // Phase-1 LERP: build incoming with raw coords (= TARGET)
      const incoming = objects.map(obj => {
        const bbox = obj.bbox || {}
        const x    = bbox.x      ?? obj.x ?? 0
        const y    = bbox.y      ?? obj.y ?? 0
        const w    = bbox.width  ?? bbox.w ?? obj.width  ?? obj.w ?? 0
        const h    = bbox.height ?? bbox.h ?? obj.height ?? obj.h ?? 0

        let conf = obj.confidence ?? 0
        const confPct = conf > 1 ? Number(conf) : Number(conf) * 100

        return {
          id:         obj.id ? `${frontendUc}-${obj.id}` : `${frontendUc}-${Date.now()}`,
          useCase:    frontendUc,
          color,
          label:      obj.label || frontendUc,
          confidence: confPct,
          x, y, w, h,                       // raw coords → used as TARGET
          hasBbox:    w > 0 && h > 0,
          age: 0, alpha: 1,
        }
      })

      // ── LERP merge: match by id, update TARGET only, keep CURRENT for slide ──
      const incomingIds = new Set(incoming.map(d => d.id))
      const existingMap = new Map(detsRef.current.map(d => [d.id, d]))

      const merged = incoming.map(d => {
        const ex = existingMap.get(d.id)
        if (!ex) {
          return { ...d, targetX: d.x, targetY: d.y, targetW: d.w, targetH: d.h, age: 0, alpha: 1 }
        }
        return {
          ...ex,
          targetX:    d.x, targetY:    d.y, targetW:    d.w, targetH:    d.h,
          confidence: d.confidence,
          label:      d.label,
          age:        0,
          alpha:      1,
        }
      })

      // Stale tracks (not in this payload): brief grace before removal
      const staleKept = detsRef.current
        .filter(d => !incomingIds.has(d.id))
        .map(d => ({ ...d, targetGone: true }))

      detsRef.current = [...merged, ...staleKept]
    }

    const u1 = sseManager.subscribe(url, backendUc,   handlePayload)
    const u2 = sseManager.subscribe(url, 'detection', handlePayload)
    const u3 = sseManager.subscribe(url, 'message',   handlePayload)

    return () => { u1(); u2(); u3() }
  }, [camera.id, camera.useCase, isActive])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isActive) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    let running = true

    const render = () => {
      if (!running) return
      frameRef.current++
      const vid = videoRef.current

      if (camera.hlsUrl && vid && vid.readyState >= 2) {
        ctx.drawImage(vid, 0, 0, W, H)
        ctx.fillStyle = 'rgba(0,0,0,0.03)'
        for (let y = (frameRef.current * 2) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1)
      } else {
        drawMockBg(ctx, W, H, frameRef.current, null)
      }

      const origW = (camera.hlsUrl && vid?.videoWidth) ? vid.videoWidth : 1280
      const origH = (camera.hlsUrl && vid?.videoHeight) ? vid.videoHeight : 720

      // ── Phase-1 LERP: slide current toward target each frame ──
      const LERP = 0.18
      const HOLD_ALPHA_AGE = 6
      const FADE_WINDOW = 150
      detsRef.current = detsRef.current
        .map(d => {
          const nextAge = d.age + 1
          const tx = d.targetX ?? d.x, ty = d.targetY ?? d.y
          const tw = d.targetW ?? d.w, th = d.targetH ?? d.h
          const nx = d.x + (tx - d.x) * LERP
          const ny = d.y + (ty - d.y) * LERP
          const nw = d.w + (tw - d.w) * LERP
          const nh = d.h + (th - d.h) * LERP
          let alpha
          if (nextAge <= HOLD_ALPHA_AGE) {
            alpha = 1
          } else {
            const window = d.targetGone ? 30 : FADE_WINDOW
            alpha = Math.max(0, 1 - (nextAge - HOLD_ALPHA_AGE) / window)
          }
          return { ...d, x: nx, y: ny, w: nw, h: nh, age: nextAge, alpha }
        })
        .filter(d => d.alpha > 0.05)
      detsRef.current.forEach(d => drawDetBox(ctx, d, W, H, origW, origH))

      if (detsRef.current.length > 0) {
        ctx.font = `bold 11px Inter, sans-serif`
        ctx.fillStyle = ucColor + 'ee'
        ctx.fillText(`${detsRef.current.length}`, W - 20, H - 10)
      }
      animRef.current = requestAnimationFrame(render)
    }
    animRef.current = requestAnimationFrame(render)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [camera, isActive, ucColor])

  return (
    <div
      onClick={isActive ? onClick : undefined}
      onDoubleClick={isActive ? onDoubleClick : undefined}
      className={isActive ? 'card-hover' : ''}
      style={{
        background: '#fff', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', overflow: 'hidden',
        boxShadow: 'var(--shadow)',
        cursor: isActive ? 'pointer' : 'not-allowed',
        opacity: isActive ? 1 : 0.65,
        transition: 'all 0.2s',
      }}
    >
      <video ref={videoRef} style={{ display: 'none' }} muted playsInline autoPlay />

      {/* Canvas area */}
      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0f172a', borderRadius: 'var(--radius) var(--radius) 0 0', overflow: 'hidden' }}>

        {isActive ? (
          <canvas ref={canvasRef} width={640} height={360}
            style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1 }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 28, opacity: 0.2 }}>📷</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', fontWeight: 600 }}>
              {camera.status === 'error' ? 'SIGNAL LOST' : 'OFFLINE'}
            </span>
          </div>
        )}

        {/* Status badge */}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: isActive ? 'rgba(22,163,74,0.85)' : 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(4px)',
          border: `1px solid ${isActive ? '#16a34a44' : 'rgba(255,255,255,0.1)'}`,
          padding: '3px 9px', borderRadius: 12,
          fontSize: 9, fontWeight: 700,
          color: '#fff', display: 'flex', alignItems: 'center', gap: 4,
          letterSpacing: '0.05em',
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', boxShadow: isActive ? '0 0 4px #fff' : 'none' }} />
          {st.label.toUpperCase()}
        </div>

        {/* Alert count */}
        {camera.alertCount > 0 && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            background: 'rgba(220,38,38,0.9)', backdropFilter: 'blur(4px)',
            color: '#fff', fontSize: 10, fontWeight: 700,
            padding: '2px 8px', borderRadius: 10,
          }}>
            ⚠ {camera.alertCount}
          </div>
        )}

        {/* LIVE badge */}
        {camera.hlsUrl && isActive && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: 'rgba(37,99,235,0.8)',
            backdropFilter: 'blur(4px)',
            color: '#fff', fontSize: 9, fontWeight: 700,
            padding: '2px 7px', borderRadius: 8, letterSpacing: '0.05em',
            zIndex: 10
          }}>LIVE</div>
        )}
      </div>

      {/* Info bar */}
      <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{camera.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{camera.location}</div>
        </div>
      </div>
    </div>
  )
}
