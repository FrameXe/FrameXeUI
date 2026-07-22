import { useEffect, useRef, useState } from 'react'
import { attachHLS } from '../../services/hls.js'
import { sseManager } from '../../lib/sseManager.js'
import { drawDetBox, drawMockBg } from '../../services/canvasDraw.js'
import { UC_COLOR } from '../../constants/useCases.js'
import { ORIG_W, ORIG_H } from '../../config/index.js'
import { agentAPI } from '../../services/api.js'


const ST = {
  active:   { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Active' },
  inactive: { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Offline' },
  error:    { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Error' },
  offline:  { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Offline' },
}

export default function MiniCanvas({ camera, activeUseCase, onClick, onDoubleClick }) {
  const canvasRef      = useRef(null)
  const videoRef       = useRef(null)
  const animRef        = useRef(null)
  const frameRef       = useRef(0)
  const detsRef        = useRef([])
  const hlsInstanceRef = useRef(null)                  // PDT sync ke liye hls instance
  const hlsReadyRef    = useRef(false)                 // FIX: video actually playable hai?
  const sseBufferRef   = useRef([])                    // sliding queue: [{ timestamp, objects }]
  const [hlsLoading, setHlsLoading] = useState(false)  // FIX: loading state for overlay
  const [retryKey, setRetryKey] = useState(0)

  const isActive = camera.status === 'active'
  const ucColor  = UC_COLOR[camera.useCase] || '#2563eb'
  const st       = ST[camera.status] || ST.inactive

  // HLS attach — instance ref mein store karo taaki render loop access kar sake
  useEffect(() => {
    if (!camera.hlsUrl) return
    const vid = videoRef.current
    hlsReadyRef.current = false
    setHlsLoading(true)

    let retryTimeout = null

    // Video events — jab video actually play ho sake tab hlsReadyRef flip karo
    const onCanPlay = () => {
      hlsReadyRef.current = true
      setHlsLoading(false)
      vid.play().catch(() => {})
    }
    const onPlaying = () => {
      hlsReadyRef.current = true
      setHlsLoading(false)
    }
    const onError = () => {
      hlsReadyRef.current = false
      if (!retryTimeout) {
        retryTimeout = setTimeout(() => {
          setRetryKey(k => k + 1)
        }, 3000)
      }
    }

    vid.addEventListener('canplay', onCanPlay)
    vid.addEventListener('playing', onPlaying)
    vid.addEventListener('error', onError)

    attachHLS(vid, camera.hlsUrl).then(h => {
      hlsInstanceRef.current = h
    })

    // Watchdog: recreate player if it fails to buffer after 8s
    const watchdog = setTimeout(() => {
      if (!hlsReadyRef.current) {
        console.log('[HLS Watchdog] Stream not ready after 8s, retrying...', camera.camera_id)
        setRetryKey(k => k + 1)
      }
    }, 8000)

    return () => {
      clearTimeout(watchdog)
      clearTimeout(retryTimeout)
      vid.removeEventListener('canplay', onCanPlay)
      vid.removeEventListener('playing', onPlaying)
      vid.removeEventListener('error', onError)
      hlsInstanceRef.current?.destroy()
      hlsInstanceRef.current = null
      hlsReadyRef.current = false
      setHlsLoading(false)
    }
  }, [camera.hlsUrl, retryKey])

  // Detection feed via SSE — PDT sync ke liye buffer mein store karo
  // Endpoint: /api/sse/cameras/${id}/detections/${usecase}
  // Payload : { camera_id, usecase, timestamp, objects:[{id,label,bbox:{x,y,width,height},confidence}] }
  useEffect(() => {
    const currentUseCase = activeUseCase || camera.useCase
    if (!isActive || !camera.id || !currentUseCase) return
    sseBufferRef.current = []  // reconnect pe buffer clear karo

    // 'traffic' on frontend === 'vehicle_count' on backend
    const frontendUc = currentUseCase === 'vehicle_count' ? 'traffic' : currentUseCase
    const backendUc  = currentUseCase === 'traffic' ? 'vehicle_count' : currentUseCase
    const url   = `/api/sse/cameras/${camera.id}/detections/${backendUc}`
    const color = UC_COLOR[frontendUc] || UC_COLOR[currentUseCase] || '#2563eb'

    const handlePayload = (payload) => {
      const rawObjects = Array.isArray(payload)
        ? payload
        : (payload?.objects ?? payload?.detections ?? [])

      // Filter boxes — sirf relevant use-case ke objects rakho
      const objects = rawObjects.filter(obj => {
        const label = (obj.label || '').toLowerCase().trim()
        if (frontendUc === 'people_count') {
          return label === 'person' || label === 'people' || label === 'pedestrian'
        } else if (frontendUc === 'traffic') {
          return label !== 'person' && label !== 'people' && label !== 'pedestrian'
        }
        return true
      })

      // Raw detections ko standard shape mein map karo
      const mappedObjects = objects.map(obj => {
        const bbox  = obj.bbox || {}
        const x     = bbox.x      ?? obj.x ?? 0
        const y     = bbox.y      ?? obj.y ?? 0
        const w     = bbox.width  ?? bbox.w ?? obj.width  ?? obj.w ?? 0
        const h     = bbox.height ?? bbox.h ?? obj.height ?? obj.h ?? 0
        let conf    = obj.confidence ?? 0
        const confPct = conf > 1 ? Number(conf) : Number(conf) * 100
        return {
          id:         obj.track_id || obj.id
                        ? `${frontendUc}-${obj.track_id || obj.id}`
                        : `${frontendUc}-${Math.random()}`,
          useCase:    frontendUc,
          color,
          label:      obj.label || frontendUc,
          confidence: confPct,
          x, y, w, h,
          hasBbox:    w > 0 && h > 0,
        }
      })

      // Backend timestamp (epoch seconds → ms)
      const sseTimeMs = (payload.timestamp || (Date.now() / 1000)) * 1000



      // Sliding queue mein push karo
      sseBufferRef.current.push({
        timestamp: sseTimeMs,
        receivedAt: Date.now(),
        objects: mappedObjects
      })

      // 20 second se purani entries hata do — memory leak se bachao
      const cutoff = Date.now() - 20000
      sseBufferRef.current = sseBufferRef.current.filter(item => item.receivedAt > cutoff)
    }

    const u1 = sseManager.subscribe(url, backendUc,   handlePayload)
    const u2 = sseManager.subscribe(url, 'detection', handlePayload)
    const u3 = sseManager.subscribe(url, 'message',   handlePayload)

    return () => { u1(); u2(); u3() }
  }, [camera.id, camera.useCase, activeUseCase, isActive])

  // Render loop — PDT sync + LERP interpolation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isActive) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    let running = true

    const render = () => {
      if (!running) return
      frameRef.current++
      const vid     = videoRef.current
      const hlsInst = hlsInstanceRef.current

      // FIX: readyState >= 1 (HAVE_METADATA) use karo, aur hlsReadyRef check karo
      // Pehle readyState >= 2 tha — HLS live stream pe yeh 2-3s lag sakta hai → black screen
      const videoReady = camera.hlsUrl && vid && hlsReadyRef.current && vid.readyState >= 1

      // Video frame ya mock background draw karo
      if (videoReady) {
        try {
          ctx.drawImage(vid, 0, 0, W, H)
          ctx.fillStyle = 'rgba(0,0,0,0.03)'
          for (let y = (frameRef.current * 2) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1)
        } catch (_) {
          // Video element abhi ready nahi — mock bg draw karo
          drawMockBg(ctx, W, H, frameRef.current, null)
        }
      } else {
        drawMockBg(ctx, W, H, frameRef.current, null)
      }

      const origW = ORIG_W
      const origH = ORIG_H

      // ── DIRECT TIMESTAMP SYNC ──
      // Backend and browser share the same system clock (WSL2/Docker on same machine).
      // Compare payload.timestamp (Unix epoch ms) to current video frame time.
      let targetObjects = []
      let isSynced = false

      if (videoReady && vid && hlsInst) {
        const hlsLatencyMs = (hlsInst.latency ?? 0) * 1000
        const videoFrameTs = Date.now() - hlsLatencyMs // when was the current video frame live?

        if (sseBufferRef.current.length > 0) {
          // Find detection whose backend timestamp is closest to current video frame time
          const closestPayload = sseBufferRef.current.reduce((prev, curr) =>
            Math.abs(curr.timestamp - videoFrameTs) < Math.abs(prev.timestamp - videoFrameTs) ? curr : prev
          )
          targetObjects = closestPayload.objects
          isSynced = true
        }
      }

      // Fallback: show latest if video not ready or no HLS
      if (!isSynced && sseBufferRef.current.length > 0) {
        targetObjects = sseBufferRef.current[sseBufferRef.current.length - 1].objects
      }

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
            age:   0,
            alpha: 1,
          }
        }
        return { ...inc, targetX: inc.x, targetY: inc.y, targetW: inc.w, targetH: inc.h, targetGone: false, age: 0, alpha: 1 }
      })

      detsRef.current = merged

      // ── Phase-1 LERP: current coords ko target ki taraf slide karo ──
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

      if (detsRef.current.length > 0) {
        ctx.font      = `bold 11px Inter, sans-serif`
        ctx.fillStyle = ucColor + 'ee'
        ctx.fillText(`${detsRef.current.length}`, W - 20, H - 10)
      }
      animRef.current = requestAnimationFrame(render)
    }
    animRef.current = requestAnimationFrame(render)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [camera.id, camera.useCase, activeUseCase, isActive, ucColor])

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
      <video ref={videoRef} style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0.001, pointerEvents: 'none', overflow: 'hidden' }} muted playsInline autoPlay />

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

        {/* FIX: HLS loading overlay — black screen ki jagah buffering indicator */}
        {isActive && camera.hlsUrl && hlsLoading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(2px)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.15)',
              borderTopColor: ucColor,
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.1em' }}>
              BUFFERING…
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
            background: hlsLoading ? 'rgba(234,179,8,0.8)' : 'rgba(37,99,235,0.8)',
            backdropFilter: 'blur(4px)',
            color: '#fff', fontSize: 9, fontWeight: 700,
            padding: '2px 7px', borderRadius: 8, letterSpacing: '0.05em',
            zIndex: 10,
            transition: 'background 0.3s',
          }}>{hlsLoading ? '◌ CONNECTING' : 'LIVE'}</div>
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
