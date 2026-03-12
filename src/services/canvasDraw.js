// ══════════════════════════════════════════════════════════════
//  CANVAS DRAWING UTILITIES
//  Sare canvas draw functions ek jagah
// ══════════════════════════════════════════════════════════════

import { ORIG_W, ORIG_H } from '../config/index.js'

// Backend coordinates (ORIG_W x ORIG_H) → canvas display size
export function sc(val, canvasDim, origDim) {
  return val * (canvasDim / origDim)
}
export function scBox(det, cW, cH) {
  return {
    x: sc(det.x, cW, ORIG_W),
    y: sc(det.y, cH, ORIG_H),
    w: sc(det.w, cW, ORIG_W),
    h: sc(det.h, cH, ORIG_H),
  }
}

// Draw one detection bounding box
export function drawDetBox(ctx, det, cW, cH) {
  const { x, y, w, h } = scBox(det, cW, cH)
  const c  = det.crossed ? '#ff3b3b' : det.color
  const al = det.alpha ?? 1
  if (al < 0.05) return

  ctx.save()
  ctx.globalAlpha = al
  ctx.shadowColor = c
  ctx.shadowBlur  = det.crossed ? 22 : 10
  ctx.strokeStyle = c
  ctx.lineWidth   = det.crossed ? 2.5 : 1.8

  // Corner brackets — CCTV style
  const cs = Math.max(7, Math.min(16, w * 0.14))
  ctx.beginPath(); ctx.moveTo(x,     y+cs);   ctx.lineTo(x,   y);   ctx.lineTo(x+cs,   y);   ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x+w-cs,y);      ctx.lineTo(x+w, y);   ctx.lineTo(x+w,    y+cs); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x,     y+h-cs); ctx.lineTo(x,   y+h); ctx.lineTo(x+cs,   y+h); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x+w-cs,y+h);   ctx.lineTo(x+w, y+h); ctx.lineTo(x+w, y+h-cs); ctx.stroke()
  ctx.shadowBlur = 0

  // Label
  const txt = det.plate    ? det.plate
            : det.speedVal ? `${det.speedVal} km/h`
            : `${det.label}  ${Number(det.confidence).toFixed(0)}%`

  ctx.font = `bold 11px 'Courier New'`
  const tw = ctx.measureText(txt).width
  ctx.fillStyle = det.crossed ? 'rgba(160,0,0,0.88)' : 'rgba(4,12,28,0.88)'
  ctx.fillRect(x, y - 20, tw + 10, 18)
  ctx.fillStyle = c
  ctx.fillText(txt, x + 5, y - 6)

  if (det.crossed || det.label === 'INTRUDER') {
    ctx.fillStyle = 'rgba(255,0,0,0.07)'
    ctx.fillRect(x, y, w, h)
  }

  ctx.restore()
}

// Draw count line + draft
export function drawCountLine(ctx, line, count, draft) {
  const l = line || draft
  if (!l) return
  const { x1, y1, x2, y2 } = l
  const isDraft = !line

  ctx.save()
  ctx.shadowColor = isDraft ? '#ffd600' : '#00ff88'
  ctx.shadowBlur  = 14
  ctx.setLineDash(isDraft ? [10, 6] : [])
  ctx.strokeStyle = isDraft ? '#ffd600' : '#00ff88'
  ctx.lineWidth   = 2.5
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  ctx.setLineDash([]); ctx.shadowBlur = 0

  if (!isDraft) {
    // Endpoints
    ;[{x:x1,y:y1},{x:x2,y:y2}].forEach(p => {
      ctx.fillStyle = '#00ff88'
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill()
    })
    // Count badge
    const mx = (x1+x2)/2, my = (y1+y2)/2
    const txt = `COUNT: ${count}`
    ctx.font = `bold 13px 'Courier New'`
    const tw = ctx.measureText(txt).width
    ctx.fillStyle = 'rgba(0,255,136,0.92)'
    ctx.fillRect(mx - tw/2 - 9, my - 22, tw + 18, 20)
    ctx.fillStyle = '#000'
    ctx.fillText(txt, mx - tw/2, my - 7)
    // Arrow showing direction
    const ang = Math.atan2(y2-y1, x2-x1) + Math.PI/2
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(mx, my)
    ctx.lineTo(mx + Math.cos(ang)*18, my + Math.sin(ang)*18); ctx.stroke()
  }
  ctx.restore()
}

// Mock CCTV background when no HLS stream
export function drawMockBg(ctx, W, H, frame, camName) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#08111e'); g.addColorStop(1, '#050a14')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(0,180,255,0.022)'; ctx.lineWidth = 1
  for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
  for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.05)'
  for (let y = (frame*2)%4; y < H; y += 4) ctx.fillRect(0, y, W, 1)

  // Vignette
  const v = ctx.createRadialGradient(W/2,H/2,H*.1,W/2,H/2,H*.85)
  v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(0,0,0,0.65)')
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)

  // OSD
  ctx.font = "9px 'Courier New'"; ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.fillText(`${new Date().toLocaleTimeString()} ● REC`, 10, H - 9)
  if (camName) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillText(camName.toUpperCase(), 10, 18)
  }
}

// Check if a detection box crosses a line
export function crossesLine(det, line, cW, cH) {
  if (!line) return false
  const { x, y, w, h } = scBox(det, cW, cH)
  const cx = x + w/2, cy = y + h
  const { x1, y1, x2, y2 } = line
  const dx = x2-x1, dy = y2-y1
  const len2 = dx*dx + dy*dy
  if (!len2) return false
  const t = Math.max(0, Math.min(1, ((cx-x1)*dx + (cy-y1)*dy) / len2))
  return Math.hypot(cx-(x1+t*dx), cy-(y1+t*dy)) < 20
}
