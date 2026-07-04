// ══════════════════════════════════════════════════════════════
//  INTELLIGENCE SUITE CONFIGURATION
// ══════════════════════════════════════════════════════════════

export const USE_CASES = [
  { 
    id: 'people_count', 
    label: 'People Counting', 
    emoji: '👥', 
    color: '#4f6df5', 
    unit: 'persons', 
    desc: 'Real-time occupancy and flow monitoring',
    statFn: (dets) => dets.length, // Total count of people
    mockTypes: ['person', 'face'] 
  },
  { 
    id: 'traffic', 
    label: 'Traffic Intelligence', 
    emoji: '🚥', 
    color: '#0ea5e9', 
    unit: 'incidents', 
    desc: 'Wrong way, parking, congestion, and speed monitoring',
    statFn: (dets) => dets.length,
    mockTypes: ['car', 'truck', 'bike'] 
  },
  { 
    id: 'intrusion', 
    label: 'Intrusion Detection', 
    emoji: '🚨', 
    color: '#ef4444', 
    unit: 'alerts', 
    desc: 'Protected zone breach monitoring',
    statFn: (dets) => dets.length, 
    mockTypes: ['person', 'intruder']
  },
  { 
    id: 'crowd_alert', 
    label: 'Crowd Intelligence', 
    emoji: '⚠️', 
    color: '#f59e0b', 
    unit: 'clusters', 
    desc: 'Density and crowd flow control',
    statFn: (dets) => dets.length,
    mockTypes: ['person'] 
  },
  { 
    id: 'vehicle_speed', 
    label: 'Speed Monitoring', 
    emoji: '⚡', 
    color: '#10b981', 
    unit: 'km/h', 
    desc: 'Traffic speed enforcement analytics',
    statFn: (dets) => dets.length > 0 ? 45 : 0, // Placeholder for speed logic
    mockTypes: ['car'] 
  },
]

export const UC_MAP = Object.fromEntries(USE_CASES.map(u => [u.id, u]))
export const UC_COLOR = Object.fromEntries(USE_CASES.map(u => [u.id, u.color]))
UC_COLOR['vehicle_count'] = UC_COLOR['traffic']  // alias

// Canvas box colors per usecase
export const UC_CANVAS = {
  people_count:    { color: '#00ff88', label: 'Person' },
  traffic:         { color: '#00cfff', label: 'Vehicle' },
  vehicle_count:   { color: '#00cfff', label: 'Vehicle' },  // alias — backend sends 'vehicle_count'
  intrusion:       { color: '#ff3b3b', label: 'INTRUDER' },
  crowd_alert:     { color: '#ff8c00', label: 'Person' },
  vehicle_speed:   { color: '#ffd600', label: 'Vehicle' },
  queue_detection: { color: '#ff9f43', label: 'Queue' },
  lpr:             { color: '#a78bfa', label: 'Plate' },
}