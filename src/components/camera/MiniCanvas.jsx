import { useEffect, useRef } from 'react'
import { attachHLS } from '../../services/hls.js'
import { startLiveFeed } from '../../services/liveDetections.js'
import { drawDetBox, drawMockBg } from '../../services/canvasDraw.js'
import { UC_COLOR } from '../../constants/useCases.js'

const ST = {
  active: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Active' },
  inactive: { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Offline' },
  error: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Error' },
  offline: { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Offline' },
}

export default function MiniCanvas({ camera, onClick, onDoubleClick }) {
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const animRef = useRef(null)
  const frameRef = useRef(0)
  const detsRef = useRef([])

  // YouTube detection
  const ytRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const ytMatch = camera.hlsUrl?.match(ytRegex)
  const ytId = (ytMatch && ytMatch[2]?.length === 11) ? ytMatch[2] : null
  const isYt = !!ytId

  const isActive = camera.status === 'active'
  const ucColor = UC_COLOR[camera.useCase] || '#2563eb'
  const st = ST[camera.status] || ST.inactive

  useEffect(() => {
    if (!camera.hlsUrl || isYt) return
    let hlsInst = null
    attachHLS(videoRef.current, camera.hlsUrl).then(h => { hlsInst = h })
    return () => hlsInst?.destroy()
  }, [camera.hlsUrl, isYt])

  useEffect(() => {
    if (!isActive) return
    const stop = startLiveFeed(camera, camera.useCase, (det) => {
      detsRef.current = [...detsRef.current.slice(-10), det]
    })
    return stop
  }, [camera.id, camera.useCase, isActive])

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
      if (camera.hlsUrl && !isYt && vid && vid.readyState >= 2) {
        ctx.drawImage(vid, 0, 0, W, H)
        ctx.fillStyle = 'rgba(0,0,0,0.03)'
        for (let y = (frameRef.current * 2) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1)
      } else if (!isYt) {
        drawMockBg(ctx, W, H, frameRef.current, null)
      } else {
        // YouTube mode → Clear canvas for overlay
        ctx.clearRect(0, 0, W, H)
      }
      detsRef.current = detsRef.current
        .map(d => ({ ...d, age: d.age + 1, alpha: Math.max(0, 1 - d.age / 70) }))
        .filter(d => d.alpha > 0.05)
      detsRef.current.forEach(d => drawDetBox(ctx, d, W, H))
      if (detsRef.current.length > 0) {
        ctx.font = `bold 11px Inter, sans-serif`
        ctx.fillStyle = ucColor + 'ee'
        ctx.fillText(`${detsRef.current.length}`, W - 20, H - 10)
      }
      animRef.current = requestAnimationFrame(render)
    }
    animRef.current = requestAnimationFrame(render)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [camera, isActive, ucColor, isYt])

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
        {isYt && isActive && (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&modestbranding=1`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
            allow="autoplay; encrypted-media"
          />
        )}
        
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
          <div style={{
            width: 5, height: 5, borderRadius: '50%', background: '#fff',
            boxShadow: isActive ? '0 0 4px #fff' : 'none',
          }} />
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

        {/* Source badge */}
        {camera.hlsUrl && isActive && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: isYt ? 'rgba(255,0,0,0.8)' : 'rgba(37,99,235,0.8)', 
            backdropFilter: 'blur(4px)',
            color: '#fff', fontSize: 9, fontWeight: 700,
            padding: '2px 7px', borderRadius: 8, letterSpacing: '0.05em',
            zIndex: 10
          }}>{isYt ? 'YOUTUBE' : 'LIVE'}</div>
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
