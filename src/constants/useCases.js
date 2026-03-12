// ─── Naya use case add karna ho: bas yahan ek entry daao ───────
// Sidebar, routing, pages — sab automatically update ho jaayenge

export const USE_CASES = [
  {
    id:        'people',
    label:     'People Counting',
    emoji:     '👥',
    color:     '#00ff88',
    unit:      'persons',
    desc:      'Count people entering / exiting zones',
    statFn:    (dets) => dets.length,
    statLabel: 'Total Persons',
  },
  {
    id:        'vehicle',
    label:     'Vehicle Count',
    emoji:     '🚗',
    color:     '#00cfff',
    unit:      'vehicles',
    desc:      'Track vehicle movement and volume',
    statFn:    (dets) => dets.length,
    statLabel: 'Total Vehicles',
  },
  {
    id:        'speed',
    label:     'Speed Detection',
    emoji:     '⚡',
    color:     '#ffd600',
    unit:      'km/h',
    desc:      'Detect over-speed violations',
    statFn:    (dets) => dets.filter(d => Number(d.value) > 80).length,
    statLabel: 'Violations >80 km/h',
  },
  {
    id:        'lpr',
    label:     'License Plate',
    emoji:     '🔲',
    color:     '#b97fff',
    unit:      'plates',
    desc:      'Automatic license plate recognition',
    statFn:    (dets) => new Set(dets.map(d => d.value)).size,
    statLabel: 'Unique Plates',
  },
  {
    id:        'intrusion',
    label:     'Intrusion',
    emoji:     '🚨',
    color:     '#ff3b3b',
    unit:      'events',
    desc:      'Detect unauthorized zone entry',
    statFn:    (dets) => dets.length,
    statLabel: 'Intrusion Events',
  },
]

export const UC_MAP   = Object.fromEntries(USE_CASES.map(u => [u.id, u]))
export const UC_COLOR = Object.fromEntries(USE_CASES.map(u => [u.id, u.color]))

// Canvas box label/color per useCase
export const UC_CANVAS = {
  people:    { color: '#00ff88', label: 'Person'  },
  vehicle:   { color: '#00cfff', label: 'Vehicle' },
  speed:     { color: '#ffd600', label: 'Vehicle' },
  lpr:       { color: '#b97fff', label: 'Plate'   },
  intrusion: { color: '#ff3b3b', label: 'INTRUDER'},
}
