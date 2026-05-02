import { useState, useEffect } from 'react'
import { useCameras } from '../hooks/useCameras.js'
import { cameraAPI } from '../services/api.js'
import { USE_CASES } from '../constants/useCases.js'
import { Loading } from '../components/shared/index.jsx'
import { Check, Save, Search, ChevronLeft, ChevronRight } from 'lucide-react'

const TRAFFIC_SUB_MODELS = [
  { id: 'speeding', label: 'Speeding', emoji: '🚓', color: '#10b981' },
  { id: 'wrong_way', label: 'Wrong Way', emoji: '⛔', color: '#ef4444' },
  { id: 'parking_mgmt', label: 'Parking Mgmt', emoji: '🅿️', color: '#3b82f6' },
  { id: 'illegal_parking', label: 'Illegal Parking', emoji: '🚫', color: '#ef4444' },
  { id: 'congestion', label: 'Congestion', emoji: '🚦', color: '#f59e0b' },
  { id: 'vehicle_count', label: 'Vehicle Flow', emoji: '📊', color: '#8b5cf6' }
]

const PEOPLE_SUB_MODELS = [
  { id: 'occupancy', label: 'Occupancy Check', emoji: '🧑‍🤝‍🧑', color: '#4f6df5' },
  { id: 'line_crossing', label: 'Line Crossing', emoji: '〰️', color: '#6366f1' },
  { id: 'dwell_time', label: 'Dwell Time', emoji: '⏱️', color: '#8b5cf6' },
  { id: 'fall_detection', label: 'Fall Detection', emoji: '🤕', color: '#ef4444' }
]

const CROWD_SUB_MODELS = [
  { id: 'density', label: 'Density Heatmap', emoji: '🫂', color: '#f59e0b' },
  { id: 'social_distancing', label: 'Safe Distancing', emoji: '↔️', color: '#10b981' },
  { id: 'loitering', label: 'Loitering Flow', emoji: '⏳', color: '#f97316' },
  { id: 'panic_running', label: 'Panic Pattern', emoji: '🏃', color: '#ef4444' }
]

const INTRUSION_SUB_MODELS = [
  { id: 'perimeter_breach', label: 'Perimeter Breach', emoji: '🚧', color: '#ef4444' },
  { id: 'zone_entry', label: 'Restricted Entry', emoji: '⚠️', color: '#f97316' },
  { id: 'tailgating', label: 'Tailgating Risk', emoji: '🚶‍♂️', color: '#10b981' }
]

export default function CameraManagement() {
  const { cameras, loading } = useCameras()
  const [localCams, setLocalCams] = useState([])
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 24

  useEffect(() => {
    if (cameras.length) setLocalCams(cameras.map(c => ({ ...c, enabled_usecases: [...(c.enabled_usecases || [])] })))
  }, [cameras])

  const filteredCams = localCams.filter(c => {
    const sq = searchQuery.toLowerCase()
    return !sq || 
      (c.id || '').toLowerCase().includes(sq) || 
      (c.location || '').toLowerCase().includes(sq)
  })

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const totalPages = Math.ceil(filteredCams.length / ITEMS_PER_PAGE)
  const paginatedCams = filteredCams.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const toggle = (camId, ucId) => {
    setLocalCams(prev => prev.map(c => {
      if (c.id !== camId) return c
      const ucs = c.enabled_usecases.includes(ucId)
        ? c.enabled_usecases.filter(u => u !== ucId)
        : [...c.enabled_usecases, ucId]
      return { ...c, enabled_usecases: ucs }
    }))
  }

  const save = async (camId) => {
    const cam = localCams.find(c => c.id === camId)
    if (!cam) return
    setSaving(camId)
    try {
      await cameraAPI.assignUseCases(camId, cam.enabled_usecases)
      setSaved(camId)
      setTimeout(() => setSaved(null), 2000)
    } finally { setSaving(null) }
  }

  if (loading) return <Loading msg="Loading cameras…" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Camera Setup
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
            Assign AI detection use cases to each camera · {cameras.length} cameras registered
          </p>
        </div>
        
        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-3)' }} />
          <input 
            type="text" 
            placeholder="Search by ID or location..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              background: '#fff', border: '1px solid var(--border)', color: 'var(--text)',
              padding: '8px 12px 8px 30px', fontSize: 13, borderRadius: 'var(--radius-sm)',
              width: 250, boxShadow: 'var(--shadow-sm)', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Camera list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredCams.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            No cameras match your search.
          </div>
        ) : (
          paginatedCams.map(cam => {
          const isOffline = cam.status !== 'active'
          const stColor = cam.status === 'active' ? '#16a34a' : cam.status === 'error' ? '#dc2626' : '#94a3b8'
          return (
            <div key={cam.id} style={{
              background: '#fff', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 20,
              boxShadow: 'var(--shadow)',
              opacity: isOffline ? 0.6 : 1, transition: 'all 0.2s',
            }}>
              {/* Camera header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: stColor, flexShrink: 0,
                    boxShadow: cam.status === 'active' ? `0 0 6px ${stColor}66` : 'none',
                  }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                      {cam.id}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, display: 'flex', gap: 10 }}>
                      <span>📍 {cam.location}</span>
                      <span style={{ color: stColor, fontWeight: 600 }}>● {cam.status}</span>
                      {cam.hlsUrl && <span style={{ color: '#2563eb' }}>📡 Stream</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {saved === cam.id && (
                    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={14} /> Saved!
                    </span>
                  )}
                  <button onClick={() => save(cam.id)} disabled={saving === cam.id}
                    style={{
                      background: saving === cam.id ? 'var(--surface-2)' : '#2563eb',
                      color: saving === cam.id ? 'var(--text-3)' : '#fff',
                      border: 'none', padding: '8px 18px', fontSize: 12,
                      borderRadius: 'var(--radius-sm)', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 6,
                      boxShadow: saving === cam.id ? 'none' : '0 2px 6px rgba(37,99,235,0.3)',
                    }}
                  >
                    <Save size={13} />
                    {saving === cam.id ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Use case toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {USE_CASES.map(uc => {
                    const active = cam.enabled_usecases.includes(uc.id)
                    return (
                      <button key={uc.id} onClick={() => toggle(cam.id, uc.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '8px 16px', fontSize: 13, fontWeight: 700,
                          background: active ? `${uc.color}10` : 'var(--surface-2)',
                          border: `1.5px solid ${active ? uc.color + '66' : '#e2e8f0'}`,
                          color: active ? uc.color : '#64748b',
                          borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: active ? `0 2px 8px ${uc.color}20` : 'none',
                        }}
                      >
                        <span>{uc.emoji}</span>
                        <span>{uc.label}</span>
                        {active && <Check size={14} style={{ color: uc.color }} />}
                      </button>
                    )
                  })}
                </div>

                {/* Sub-Use-Case Configuration Blocks */}
                
                {/* Traffic Block */}
                {cam.enabled_usecases.includes('traffic') && (
                  <div style={{ marginTop: 8, padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, borderLeft: '4px solid #0ea5e9' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 12 }}>Traffic Sub-Models Configuration</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {TRAFFIC_SUB_MODELS.map(sub => {
                        const subActive = cam.enabled_usecases.includes(sub.id)
                        return (
                          <button key={sub.id} onClick={() => toggle(cam.id, sub.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, background: subActive ? `${sub.color}15` : '#fff', border: `1px solid ${subActive ? sub.color : '#cbd5e1'}`, color: subActive ? sub.color : '#64748b', borderRadius: 8, cursor: 'pointer', transition: 'all 0.1s' }}>
                            <span>{sub.emoji}</span><span>{sub.label}</span>{subActive && <Check size={12} />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* People Count Block */}
                {cam.enabled_usecases.includes('people_count') && (
                  <div style={{ marginTop: 8, padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, borderLeft: '4px solid #4f6df5' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 12 }}>People Counting Constraints</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {PEOPLE_SUB_MODELS.map(sub => {
                        const subActive = cam.enabled_usecases.includes(sub.id)
                        return (
                          <button key={sub.id} onClick={() => toggle(cam.id, sub.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, background: subActive ? `${sub.color}15` : '#fff', border: `1px solid ${subActive ? sub.color : '#cbd5e1'}`, color: subActive ? sub.color : '#64748b', borderRadius: 8, cursor: 'pointer', transition: 'all 0.1s' }}>
                            <span>{sub.emoji}</span><span>{sub.label}</span>{subActive && <Check size={12} />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Crowd Alert Block */}
                {cam.enabled_usecases.includes('crowd_alert') && (
                  <div style={{ marginTop: 8, padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 12 }}>Crowd Intelligence Logic</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {CROWD_SUB_MODELS.map(sub => {
                        const subActive = cam.enabled_usecases.includes(sub.id)
                        return (
                          <button key={sub.id} onClick={() => toggle(cam.id, sub.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, background: subActive ? `${sub.color}15` : '#fff', border: `1px solid ${subActive ? sub.color : '#cbd5e1'}`, color: subActive ? sub.color : '#64748b', borderRadius: 8, cursor: 'pointer', transition: 'all 0.1s' }}>
                            <span>{sub.emoji}</span><span>{sub.label}</span>{subActive && <Check size={12} />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Intrusion Block */}
                {cam.enabled_usecases.includes('intrusion') && (
                  <div style={{ marginTop: 8, padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, borderLeft: '4px solid #ef4444' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 12 }}>Perimeter Intrusion Ruleset</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {INTRUSION_SUB_MODELS.map(sub => {
                        const subActive = cam.enabled_usecases.includes(sub.id)
                        return (
                          <button key={sub.id} onClick={() => toggle(cam.id, sub.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, background: subActive ? `${sub.color}15` : '#fff', border: `1px solid ${subActive ? sub.color : '#cbd5e1'}`, color: subActive ? sub.color : '#64748b', borderRadius: 8, cursor: 'pointer', transition: 'all 0.1s' }}>
                            <span>{sub.emoji}</span><span>{sub.label}</span>{subActive && <Check size={12} />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-3)' }}>
                {cam.enabled_usecases.length} use case{cam.enabled_usecases.length !== 1 ? 's' : ''} assigned
              </div>
            </div>
          )
        })
      )}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginTop: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
            Showing <b style={{ color: 'var(--text)' }}>{(page - 1) * ITEMS_PER_PAGE + 1}</b> to <b style={{ color: 'var(--text)' }}>{Math.min(page * ITEMS_PER_PAGE, filteredCams.length)}</b> of <b style={{ color: 'var(--text)' }}>{filteredCams.length}</b> cameras
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              style={{
                padding: '6px 12px', background: page === 1 ? '#f1f5f9' : '#fff', 
                border: '1px solid var(--border)', borderRadius: 6,
                color: page === 1 ? '#94a3b8' : 'var(--text)', cursor: page === 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600
              }}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '0 8px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Page {page} of {totalPages}</span>
            </div>
            
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              style={{
                padding: '6px 12px', background: page === totalPages ? '#f1f5f9' : '#fff', 
                border: '1px solid var(--border)', borderRadius: 6,
                color: page === totalPages ? '#94a3b8' : 'var(--text)', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
