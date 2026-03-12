// ╔══════════════════════════════════════════════════════════════╗
// ║  MOCK DATA                                                   ║
// ║                                                              ║
// ║  HLS URL add karna ho:                                       ║
// ║    Camera object mein hlsUrl set karo:                       ║
// ║    hlsUrl: 'http://192.168.1.10:8888/live/cam-01/index.m3u8' ║
// ║                                                              ║
// ║  Real API pe jaana ho:                                       ║
// ║    config/index.js mein USE_MOCK = false karo                ║
// ╚══════════════════════════════════════════════════════════════╝

import { ORIG_W, ORIG_H } from '../config/index.js'

// ── CAMERAS ─────────────────────────────────────────────────────
// hlsUrl: null          → mock CCTV background dikhega
// hlsUrl: 'http://...' → real HLS video play hoga
export const MOCK_CAMERAS = [
  { id:'cam-01', name:'Gate Entrance',   location:'Main Gate',      status:'active',   useCase:'people',    alertCount:3, hlsUrl: null },
  { id:'cam-02', name:'Parking Zone A',  location:'Parking Lot',    status:'active',   useCase:'vehicle',   alertCount:1, hlsUrl: null },
  { id:'cam-03', name:'Server Room',     location:'Floor 2',        status:'active',   useCase:'intrusion', alertCount:7, hlsUrl: null },
  { id:'cam-04', name:'Highway Cam',     location:'NH-48 KM 12',    status:'active',   useCase:'speed',     alertCount:0, hlsUrl: null },
  { id:'cam-05', name:'Exit Gate',       location:'South Exit',     status:'inactive', useCase:'lpr',       alertCount:0, hlsUrl: null },
  { id:'cam-06', name:'Lobby',           location:'Ground Floor',   status:'active',   useCase:'people',    alertCount:2, hlsUrl: null },
  { id:'cam-07', name:'Warehouse Entry', location:'Warehouse',      status:'error',    useCase:'intrusion', alertCount:5, hlsUrl: null },
  { id:'cam-08', name:'Tollbooth 3',     location:'Highway Toll',   status:'active',   useCase:'lpr',       alertCount:0, hlsUrl: null },
  { id:'cam-09', name:'Mall Entry',      location:'Mall Gate',      status:'active',   useCase:'people',    alertCount:1, hlsUrl: null },
  { id:'cam-10', name:'Speedway Cam',    location:'Ring Road',      status:'active',   useCase:'speed',     alertCount:4, hlsUrl: null },
  { id:'cam-11', name:'Loading Bay',     location:'Warehouse Back', status:'active',   useCase:'vehicle',   alertCount:0, hlsUrl: null },
  { id:'cam-12', name:'Rooftop',         location:'Building Top',   status:'error',    useCase:'intrusion', alertCount:2, hlsUrl: null },
]

// ── STATIC DETECTIONS (tables, reports ke liye) ─────────────────
const PLATES = ['MH12AB1234','DL9C4567','KA01MX9900','UP32GH7788','GJ05CD3322','TN07ZZ9988']
const SPEEDS = [42, 67, 88, 103, 55, 72, 95, 110, 61, 79]
const SEV    = ['critical','high','medium','low']

function ts(minsAgo) {
  return new Date(Date.now() - minsAgo * 60000).toISOString()
}

function genDets(type, camId, camName, count = 20) {
  return Array.from({ length: count }, (_, i) => {
    const base = {
      id: `det-${camId}-${type}-${i}`,
      cameraId: camId, cameraName: camName, type,
      confidence: (Math.random() * 18 + 80).toFixed(1),
      timestamp:  ts(i * 5 + Math.random() * 4),
      severity:   null,
    }
    switch (type) {
      case 'people':    return { ...base, label: 'Person',   value: 1 }
      case 'vehicle':   return { ...base, label: 'Vehicle',  value: 1 }
      case 'speed':     return { ...base, label: 'Speed', value: SPEEDS[i % SPEEDS.length], severity: SPEEDS[i % SPEEDS.length] > 80 ? 'high' : 'low' }
      case 'lpr':       return { ...base, label: 'Plate',    value: PLATES[i % PLATES.length] }
      case 'intrusion': return { ...base, label: 'INTRUDER', value: 1, severity: 'critical' }
      default:          return base
    }
  })
}

export const MOCK_DETECTIONS = {
  people:    MOCK_CAMERAS.filter(c => c.useCase==='people').flatMap(c    => genDets('people',    c.id, c.name)),
  vehicle:   MOCK_CAMERAS.filter(c => c.useCase==='vehicle').flatMap(c   => genDets('vehicle',   c.id, c.name)),
  speed:     MOCK_CAMERAS.filter(c => c.useCase==='speed').flatMap(c     => genDets('speed',     c.id, c.name)),
  lpr:       MOCK_CAMERAS.filter(c => c.useCase==='lpr').flatMap(c       => genDets('lpr',       c.id, c.name)),
  intrusion: MOCK_CAMERAS.filter(c => c.useCase==='intrusion').flatMap(c => genDets('intrusion', c.id, c.name)),
}

// ── ALERTS ───────────────────────────────────────────────────────
const ALERT_MSG = {
  intrusion: c => `Unauthorized entry at ${c.location}`,
  speed:     c => `Over-speed: ${SPEEDS[Math.floor(Math.random()*SPEEDS.length)]} km/h at ${c.location}`,
  offline:   c => `Camera offline: ${c.name}`,
  lpr:       _  => `Blacklisted plate: ${PLATES[Math.floor(Math.random()*PLATES.length)]}`,
  people:    c => `Crowd limit exceeded at ${c.location}`,
}

export const MOCK_ALERTS = Array.from({ length: 40 }, (_, i) => {
  const cam  = MOCK_CAMERAS[i % MOCK_CAMERAS.length]
  const type = ['intrusion','speed','offline','lpr','people'][i % 5]
  return {
    id: `alert-${i}`, type,
    cameraId: cam.id, cameraName: cam.name, location: cam.location,
    message:  ALERT_MSG[type](cam),
    severity: SEV[i % 4],
    acknowledged: i > 7,
    timestamp:    ts(i * 6),
  }
})

// ── LIVE DETECTION GENERATOR (canvas ke liye) ───────────────────
// Yeh function har ~900ms mein ek naya detection object banata hai
// Real mode mein: WebSocket ya API se real data aayega is shape mein
//
// SHAPE:
// {
//   id, cameraId, color, label,
//   x, y, w, h  ← coordinates ORIG_W x ORIG_H resolution mein
//   confidence, plate, speedVal
// }
export function genLiveDet(cameraId, useCase) {
  const isWide  = ['vehicle','speed'].includes(useCase)
  const isSmall = useCase === 'lpr'
  const w = isSmall ? 140 : isWide ? 180 + Math.random()*60 : 55 + Math.random()*30
  const h = isSmall ? 40  : isWide ? 90  + Math.random()*40 : 130 + Math.random()*60

  const colorMap = { people:'#00ff88', vehicle:'#00cfff', speed:'#ffd600', lpr:'#b97fff', intrusion:'#ff3b3b' }
  const labelMap = { people:'Person',  vehicle:'Vehicle',  speed:'Vehicle', lpr:'Plate',   intrusion:'INTRUDER' }

  return {
    id:         `live-${cameraId}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    cameraId,
    color:      colorMap[useCase] || '#00cfff',
    label:      labelMap[useCase] || 'Object',
    // Coordinates in ORIG_W x ORIG_H space — canvas pe scale hota hai
    x:          Math.random() * (ORIG_W - w - 20) + 10,
    y:          Math.random() * (ORIG_H - h - 40) + 20,
    w, h,
    confidence: (Math.random() * 18 + 80).toFixed(1),
    plate:      useCase === 'lpr'   ? PLATES[Math.floor(Math.random() * PLATES.length)] : null,
    speedVal:   useCase === 'speed' ? SPEEDS[Math.floor(Math.random() * SPEEDS.length)] : null,
    // canvas internal use
    age:   0,
    alpha: 1,
  }
}
