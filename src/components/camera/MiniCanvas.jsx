// ══════════════════════════════════════════════════════════════
//  MINI CANVAS — Camera grid tile ka preview
//
//  Yeh component kya karta hai:
//  1. HLS stream hai → video frame canvas pe draw hota hai
//  2. HLS nahi     → animated mock CCTV background
//  3. Detection feed se boxes continuously draw hote hain
//  4. Click pe CameraDetail (fullscreen) page pe jaate ho
//
//  HLS add karna: mockData.js mein camera.hlsUrl set karo
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react'
import { attachHLS } from '../../services/hls.js'
import { startLiveFeed } from '../../services/liveDetections.js'
import { drawDetBox, drawMockBg } from '../../services/canvasDraw.js'
import { UC_COLOR } from '../../constants/useCases.js'

const ST_COLOR = { active:'#00ff88', inactive:'#4a6070', error:'#ff3b3b' }

export default function MiniCanvas({ camera, onClick }) {
  const canvasRef  = useRef(null)
  const videoRef   = useRef(null)
  const animRef    = useRef(null)
  const frameRef   = useRef(0)
  // Detections stored in ref — no re-render needed, canvas reads directly
  const detsRef    = useRef([])

  const isActive = camera.status === 'active'
  const ucColor  = UC_COLOR[camera.useCase] || '#00cfff'

  // ── Attach HLS ──────────────────────────────────────────────
  useEffect(() => {
    if (!camera.hlsUrl) return
    let hlsInst = null
    attachHLS(videoRef.current, camera.hlsUrl).then(h => { hlsInst = h })
    return () => hlsInst?.destroy()
  }, [camera.hlsUrl])

  // ── Start detection feed ────────────────────────────────────
  useEffect(() => {
    if (!isActive) return
    const stop = startLiveFeed(camera, (det) => {
      detsRef.current = [...detsRef.current.slice(-10), det]
    })
    return stop
  }, [camera.id, camera.useCase, isActive])

  // ── Render loop ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isActive) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    let running = true

    const render = () => {
      if (!running) return
      frameRef.current++

      // 1. Draw video OR mock background
      const vid = videoRef.current
      if (camera.hlsUrl && vid && vid.readyState >= 2) {
        ctx.drawImage(vid, 0, 0, W, H)
        // light scanline
        ctx.fillStyle = 'rgba(0,0,0,0.03)'
        for (let y = (frameRef.current*2)%4; y < H; y += 4) ctx.fillRect(0, y, W, 1)
      } else {
        drawMockBg(ctx, W, H, frameRef.current, null)
      }

      // 2. Age detections + draw boxes
      detsRef.current = detsRef.current
        .map(d => ({ ...d, age: d.age+1, alpha: Math.max(0, 1 - d.age/70) }))
        .filter(d => d.alpha > 0.05)
      detsRef.current.forEach(d => drawDetBox(ctx, d, W, H))

      // 3. Detection count badge
      if (detsRef.current.length > 0) {
        ctx.font = `bold 10px 'Courier New'`
        ctx.fillStyle = ucColor + 'cc'
        ctx.fillText(`${detsRef.current.length}`, W - 18, H - 8)
      }

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [camera, isActive, ucColor])

  return (
    <div
      onClick={isActive ? onClick : undefined}
      style={{
        background: '#0a111e',
        border: `1px solid ${isActive ? '#0d2030' : ST_COLOR[camera.status]+'33'}`,
        cursor: isActive ? 'pointer' : 'not-allowed',
        overflow: 'hidden',
        transition: 'all 0.18s',
      }}
      onMouseEnter={e => {
        if (!isActive) return
        e.currentTarget.style.borderColor = ucColor + '88'
        e.currentTarget.style.transform = 'scale(1.02)'
        e.currentTarget.style.boxShadow = `0 0 18px ${ucColor}22`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isActive ? '#0d2030' : ST_COLOR[camera.status]+'33'
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Hidden video — HLS plays here */}
      <video ref={videoRef} style={{ display:'none' }} muted playsInline autoPlay />

      {/* Canvas — video frame + detection boxes */}
      <div style={{ position:'relative', aspectRatio:'16/9' }}>
        {isActive
          ? (
            <canvas
              ref={canvasRef}
              width={640} height={360}
              style={{ width:'100%', height:'100%', display:'block' }}
            />
          ) : (
            <div style={{ width:'100%', height:'100%', aspectRatio:'16/9', background:'#050a14', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:6 }}>
              <span style={{ fontSize:22, opacity:.12 }}>📷</span>
              <span style={{ fontSize:9, color:'#1e3040', letterSpacing:2 }}>
                {camera.status === 'error' ? 'SIGNAL LOST' : 'OFFLINE'}
              </span>
            </div>
          )
        }

        {/* Status badge */}
        <div style={{ position:'absolute', top:7, right:7, background:`${ST_COLOR[camera.status]}15`, border:`1px solid ${ST_COLOR[camera.status]}44`, padding:'2px 7px', fontSize:9, letterSpacing:1, color:ST_COLOR[camera.status], display:'flex', alignItems:'center', gap:4 }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:ST_COLOR[camera.status], boxShadow: isActive?`0 0 5px ${ST_COLOR[camera.status]}`:'none' }}/>
          {camera.status.toUpperCase()}
        </div>

        {/* Alert badge */}
        {camera.alertCount > 0 && (
          <div style={{ position:'absolute', top:7, left:7, background:'rgba(255,59,59,0.88)', color:'#fff', fontSize:9, fontWeight:'bold', padding:'2px 7px', letterSpacing:1 }}>
            ⚠ {camera.alertCount}
          </div>
        )}

        {/* HLS indicator */}
        {camera.hlsUrl && isActive && (
          <div style={{ position:'absolute', bottom:7, left:7, background:'rgba(0,200,255,0.15)', border:'1px solid #00cfff33', color:'#00cfff', fontSize:8, padding:'2px 6px', letterSpacing:1 }}>
            HLS
          </div>
        )}
      </div>

      {/* Info bar */}
      <div style={{ padding:'7px 10px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid #0d2030' }}>
        <div>
          <div style={{ fontSize:11, fontWeight:'bold', color:'#c8d8e8' }}>{camera.name}</div>
          <div style={{ fontSize:9, color:'#2a4050', marginTop:2 }}>{camera.location}</div>
        </div>
        <div style={{ fontSize:9, color:ucColor, background:`${ucColor}15`, border:`1px solid ${ucColor}30`, padding:'2px 7px', letterSpacing:1 }}>
          {camera.useCase.toUpperCase()}
        </div>
      </div>
    </div>
  )
}
