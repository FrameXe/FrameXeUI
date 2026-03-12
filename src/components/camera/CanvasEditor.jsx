// ══════════════════════════════════════════════════════════════
//  CANVAS EDITOR — Fullscreen view
//
//  Features:
//  • HLS video ya mock background
//  • Live detection boxes (API/WS/mock se)
//  • Line draw mode: click+drag se count line banao
//  • Crossing detection: box line cross kare → red + log
//  • Right panel: live detection feed + crossing log
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react'
import { attachHLS } from '../../services/hls.js'
import { startLiveFeed } from '../../services/liveDetections.js'
import { drawDetBox, drawCountLine, drawMockBg, crossesLine } from '../../services/canvasDraw.js'
import { UC_COLOR } from '../../constants/useCases.js'
import { Btn, Tag } from '../shared/index.jsx'

export default function CanvasEditor({ camera, onClose }) {
  const canvasRef   = useRef(null)
  const videoRef    = useRef(null)
  const animRef     = useRef(null)
  const frameRef    = useRef(0)
  const detsRef     = useRef([])          // live detections (ref → no re-render)
  const lineRef     = useRef(null)        // current count line
  const countRef    = useRef(0)           // crossing count
  const crossedIds  = useRef(new Set())   // already-crossed detection ids

  const [mode,      setMode]      = useState('view')   // 'view' | 'draw'
  const [drawStart, setDrawStart] = useState(null)
  const [mousePos,  setMousePos]  = useState(null)
  const [countLine, setCountLine] = useState(null)     // for UI display
  const [lineCount, setLineCount] = useState(0)
  const [flashRed,  setFlashRed]  = useState(false)
  const [crossLog,  setCrossLog]  = useState([])       // crossing history
  const [detFeed,   setDetFeed]   = useState([])       // right panel feed
  const [tab,       setTab]       = useState('feed')

  // ── Attach HLS ──────────────────────────────────────────────
  useEffect(() => {
    if (!camera.hlsUrl) return
    let inst = null
    attachHLS(videoRef.current, camera.hlsUrl).then(h => { inst = h })
    return () => inst?.destroy()
  }, [camera.hlsUrl])

  // ── Detection feed ───────────────────────────────────────────
  useEffect(() => {
    const stop = startLiveFeed(camera, (det) => {
      detsRef.current = [...detsRef.current.slice(-18), det]
      setDetFeed(p => [{ ...det, ts: new Date().toLocaleTimeString() }, ...p.slice(0, 59)])
    })
    return stop
  }, [camera.id, camera.useCase])

  // ── Crossing check (runs on detection change) ────────────────
  useEffect(() => {
    if (!lineRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    let hit = false
    detsRef.current.forEach(det => {
      if (crossedIds.current.has(det.id)) return
      if (crossesLine(det, lineRef.current, canvas.width, canvas.height)) {
        crossedIds.current.add(det.id)
        det.crossed = true
        countRef.current++
        hit = true
        setCrossLog(p => [{
          label: det.label, confidence: det.confidence,
          plate: det.plate, speedVal: det.speedVal,
          ts: new Date().toLocaleTimeString(),
        }, ...p.slice(0, 59)])
      }
    })
    if (hit) {
      setLineCount(countRef.current)
      setFlashRed(true)
      setTimeout(() => setFlashRed(false), 400)
    }
  }, [detFeed]) // detFeed changes when new detection arrives

  // ── Render loop ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let running = true

    const render = () => {
      if (!running) return
      frameRef.current++
      const W = canvas.width, H = canvas.height

      // 1. Draw video frame or mock background
      const vid = videoRef.current
      if (camera.hlsUrl && vid && vid.readyState >= 2) {
        ctx.drawImage(vid, 0, 0, W, H)
        ctx.fillStyle = 'rgba(0,0,0,0.025)'
        for (let y = (frameRef.current*2)%4; y < H; y += 4) ctx.fillRect(0, y, W, 1)
      } else {
        drawMockBg(ctx, W, H, frameRef.current, camera.name)
      }

      // 2. Age detections
      detsRef.current = detsRef.current
        .map(d => ({ ...d, age: d.age+1, alpha: Math.max(0, 1 - d.age/80) }))
        .filter(d => d.alpha > 0.04)

      // 3. Draw detection boxes
      detsRef.current.forEach(d => drawDetBox(ctx, d, W, H))

      // 4. Draw count line + draft
      const draft = (drawStart && mousePos)
        ? { x1:drawStart.x, y1:drawStart.y, x2:mousePos.x, y2:mousePos.y }
        : null
      drawCountLine(ctx, lineRef.current, countRef.current, draft)

      // 5. Red flash on crossing
      if (flashRed) {
        ctx.fillStyle = 'rgba(255,0,0,0.1)'
        ctx.fillRect(0, 0, W, H)
      }

      // 6. Camera label OSD
      const ucColor = UC_COLOR[camera.useCase] || '#00cfff'
      ctx.font = "11px 'Courier New'"
      ctx.fillStyle = ucColor + '77'
      ctx.fillText(`${camera.name.toUpperCase()} | ${camera.useCase.toUpperCase()}`, 12, 20)

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [camera, drawStart, mousePos, flashRed])

  // ── Mouse helpers ────────────────────────────────────────────
  const getPos = useCallback((e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - r.left) * (canvasRef.current.width  / r.width),
      y: (e.clientY - r.top)  * (canvasRef.current.height / r.height),
    }
  }, [])

  const onDown = useCallback((e) => {
    if (mode !== 'draw') return
    setDrawStart(getPos(e))
    lineRef.current = null; setCountLine(null)
    countRef.current = 0; crossedIds.current = new Set(); setLineCount(0)
  }, [mode, getPos])

  const onMove = useCallback((e) => setMousePos(getPos(e)), [getPos])

  const onUp = useCallback((e) => {
    if (mode !== 'draw' || !drawStart) return
    const end = getPos(e)
    if (Math.hypot(end.x-drawStart.x, end.y-drawStart.y) > 25) {
      const l = { x1:drawStart.x, y1:drawStart.y, x2:end.x, y2:end.y }
      lineRef.current = l; setCountLine(l)
    }
    setDrawStart(null); setMode('view')
  }, [mode, drawStart, getPos])

  const clearLine = () => {
    lineRef.current = null; setCountLine(null)
    countRef.current = 0; crossedIds.current = new Set()
    setLineCount(0); setCrossLog([])
  }

  const ucColor = UC_COLOR[camera.useCase] || '#00cfff'

  return (
    <div style={{ position:'fixed', inset:0, background:'#04080f', display:'flex', flexDirection:'column', fontFamily:"'Courier New',monospace", color:'#c8d8e8', zIndex:1000 }}>
      {/* Hidden video */}
      <video ref={videoRef} style={{ display:'none' }} muted playsInline autoPlay />

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', borderBottom:'1px solid #0d1e2e', background:'#060d18', flexShrink:0, flexWrap:'wrap' }}>
        <Btn onClick={onClose}>← BACK</Btn>
        <span style={{ fontWeight:'bold', fontSize:13, letterSpacing:1 }}>{camera.name.toUpperCase()}</span>
        <span style={{ fontSize:10, color:'#2a4050' }}>{camera.location}</span>
        <Tag color={ucColor}>{camera.useCase.toUpperCase()}</Tag>
        {camera.hlsUrl && <Tag color='#00cfff'>HLS LIVE</Tag>}
        <Tag color='#00ff88'>● LIVE</Tag>
        <div style={{ flex:1 }}/>
        {/* Draw line button */}
        <Btn active={mode==='draw'} color='#ffd600' onClick={() => setMode(m => m==='draw'?'view':'draw')}>
          {mode==='draw' ? '✏ DRAWING…' : '✏ DRAW LINE'}
        </Btn>
        {countLine && <Btn color='#ff6b6b' onClick={clearLine}>✕ CLEAR LINE</Btn>}
        {/* Count display */}
        <div style={{ fontSize:11, color:'#00ff88', background:'rgba(0,255,136,0.08)', border:'1px solid #00ff8830', padding:'5px 14px', letterSpacing:1 }}>
          CROSSINGS: <b>{lineCount}</b>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Canvas */}
        <div style={{ flex:1, position:'relative', cursor: mode==='draw' ? 'crosshair' : 'default' }}>
          <canvas
            ref={canvasRef}
            width={1280} height={720}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
            style={{ width:'100%', height:'100%', display:'block' }}
          />
          {/* Draw mode hint */}
          {mode === 'draw' && (
            <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)', background:'rgba(255,214,0,0.12)', border:'1px solid #ffd60055', color:'#ffd600', padding:'6px 22px', fontSize:11, letterSpacing:2, pointerEvents:'none' }}>
              CLICK &amp; DRAG TO DRAW COUNT LINE
            </div>
          )}
          {/* Red flash border */}
          {flashRed && (
            <div style={{ position:'absolute', inset:0, border:'3px solid #ff3b3b', boxShadow:'inset 0 0 40px rgba(255,0,0,0.2)', pointerEvents:'none' }}/>
          )}
        </div>

        {/* ── Right panel ──────────────────────────────────── */}
        <div style={{ width:275, borderLeft:'1px solid #0d1e2e', background:'#060d18', display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid #0d1e2e' }}>
            {[
              { id:'feed',      label:`◈ LIVE (${detFeed.length})` },
              { id:'crossings', label:`⚠ CROSSINGS (${crossLog.length})` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex:1, padding:'9px', fontSize:10, letterSpacing:1, cursor:'pointer',
                border:'none',
                background:  tab===t.id ? '#0a1528' : 'transparent',
                color:       tab===t.id ? '#00cfff' : '#2a4050',
                borderBottom:tab===t.id ? '2px solid #00cfff' : '2px solid transparent',
              }}>{t.label}</button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex:1, overflowY:'auto' }}>

            {tab === 'feed' && (
              detFeed.length === 0
                ? <div style={{ padding:20, textAlign:'center', fontSize:10, color:'#1e3040' }}>WAITING FOR DETECTIONS…</div>
                : detFeed.map((d, i) => (
                  <div key={d.id+i} style={{
                    padding:'7px 14px', borderBottom:'1px solid #060e18',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    opacity: Math.max(0.3, 1 - i*0.025),
                    background: d.crossed ? 'rgba(255,59,59,0.04)' : 'transparent',
                  }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background: d.crossed?'#ff3b3b':d.color, boxShadow:`0 0 5px ${d.crossed?'#ff3b3b':d.color}` }}/>
                      <div>
                        <div style={{ fontSize:11, color: d.crossed?'#ff6b6b':d.color }}>
                          {d.label}
                          {d.plate   ? ` • ${d.plate}`   : ''}
                          {d.speedVal? ` • ${d.speedVal}km/h` : ''}
                          {d.crossed ? ' ⚠' : ''}
                        </div>
                        <div style={{ fontSize:9, color:'#2a4050' }}>conf: {d.confidence}%</div>
                      </div>
                    </div>
                    <span style={{ fontSize:9, color:'#1e3040', flexShrink:0 }}>{d.ts}</span>
                  </div>
                ))
            )}

            {tab === 'crossings' && (
              crossLog.length === 0
                ? <div style={{ padding:20, textAlign:'center', fontSize:10, color:'#1e3040' }}>
                    {countLine ? 'MONITORING — NO CROSSINGS YET' : 'DRAW A LINE TO START COUNTING'}
                  </div>
                : crossLog.map((c, i) => (
                  <div key={i} style={{
                    padding:'8px 14px', borderBottom:'1px solid #060e18',
                    background: i===0 ? 'rgba(255,59,59,0.06)' : 'transparent',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                  }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:'bold', color:'#ff6b6b' }}>
                        {c.label}
                        {c.plate    ? ` • ${c.plate}`       : ''}
                        {c.speedVal ? ` • ${c.speedVal}km/h` : ''}
                      </div>
                      <div style={{ fontSize:9, color:'#2a4050' }}>conf: {c.confidence}%</div>
                    </div>
                    <span style={{ fontSize:9, color:'#1e3040' }}>{c.ts}</span>
                  </div>
                ))
            )}
          </div>

          {/* Count line info */}
          {countLine && (
            <div style={{ padding:'10px 14px', borderTop:'1px solid #0d1e2e', background:'rgba(0,255,136,0.02)', fontSize:10 }}>
              <div style={{ color:'#2a4050', letterSpacing:2, marginBottom:6 }}>COUNT LINE ACTIVE</div>
              <div style={{ color:'#4a6070' }}>A <span style={{color:'#00ff88'}}>({Math.round(countLine.x1)}, {Math.round(countLine.y1)})</span></div>
              <div style={{ color:'#4a6070' }}>B <span style={{color:'#00ff88'}}>({Math.round(countLine.x2)}, {Math.round(countLine.y2)})</span></div>
              <div style={{ marginTop:6, color:'#4a6070' }}>TOTAL <span style={{color:'#ffd600', fontSize:20, fontWeight:'bold'}}>{lineCount}</span></div>
            </div>
          )}

          {/* Live stats */}
          <div style={{ padding:'10px 14px', borderTop:'1px solid #0d1e2e', fontSize:10 }}>
            <div style={{ color:'#2a4050', letterSpacing:2, marginBottom:6 }}>LIVE STATS</div>
            <div style={{ display:'flex', justifyContent:'space-between', color:'#4a6070', marginBottom:3 }}>
              <span>Active on canvas</span>
              <span style={{ color:ucColor, fontWeight:'bold' }}>{detsRef.current.length}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', color:'#4a6070' }}>
              <span>Total detected</span>
              <span style={{ color:'#c8d8e8', fontWeight:'bold' }}>{detFeed.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
