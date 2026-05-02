import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCameras }  from '../hooks/useCameras.js'
import { USE_CASES }   from '../constants/useCases.js'
import MiniCanvas      from '../components/camera/MiniCanvas.jsx'
import { Loading }     from '../components/shared/index.jsx'
import { peopleAnalyticsAPI } from '../services/api.js'
import { Maximize2, Activity, Users, AlertTriangle, Clock, Search, ChevronLeft, ChevronRight } from 'lucide-react'

// Sub-component to fetch and display stats lazily when expanded
function CameraStatsPanel({ cameraId, ucColor, onOpenCanvas }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    peopleAnalyticsAPI.get(cameraId)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [cameraId])

  if (loading || !stats) {
    return <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>Extracting forensic data...</div>
  }

  const { currentInFrame, totalToday, capacityLimit, capacityStatus, peakHour } = stats

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>In Frame</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            <Activity size={12} style={{ color: ucColor, display: 'inline', marginRight: 4 }}/>
            {currentInFrame}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>Total Count</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            <Users size={12} style={{ color: 'var(--text-3)', display: 'inline', marginRight: 4 }}/>
            {totalToday}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>Threshold</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: capacityStatus === 'critical' ? '#ef4444' : 'var(--text)' }}>
            <AlertTriangle size={12} style={{ color: capacityStatus === 'critical' ? '#ef4444' : 'var(--text-3)', display: 'inline', marginRight: 4 }}/>
            {capacityLimit}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>Peak Hour</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            <Clock size={12} style={{ color: 'var(--text-3)', display: 'inline', marginRight: 4 }}/>
            {peakHour}
          </div>
        </div>

      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4, paddingTop: 16, borderTop: '1px dashed var(--border-light)' }}>
         <button onClick={onOpenCanvas} style={{ 
           flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', 
           padding: '10px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', 
           display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 
         }}>
           <Maximize2 size={14} /> OPEN CANVAS
         </button>
      </div>
    </div>
  )
}

export default function CameraExplorer() {
  const nav = useNavigate()
  const { useCaseId } = useParams()
  const { cameras, loading } = useCameras()
  const [ucFilter, setUcFilter] = useState(useCaseId || 'all')
  const [stFilter, setStFilter] = useState('all')
  const [selectedCard, setSelectedCard] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 24

  useEffect(() => {
    if (useCaseId) {
      setUcFilter(useCaseId)
    } else {
      setUcFilter('all')
    }
  }, [useCaseId])

  const filtered = cameras.filter(c => {
    const matchesUc = ucFilter === 'all' || (c.enabled_usecases || []).includes(ucFilter)
    const matchesSt = stFilter === 'all' || c.status === stFilter
    const sq = searchQuery.toLowerCase()
    const matchesSq = !sq || 
      (c.id || '').toLowerCase().includes(sq) || 
      (c.name || '').toLowerCase().includes(sq) || 
      (c.location || '').toLowerCase().includes(sq)
      
    return matchesUc && matchesSt && matchesSq
  })

  // Reset page and selection when filters change
  useEffect(() => {
    setPage(1)
    setSelectedCard(null)
  }, [ucFilter, stFilter, searchQuery])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedCameras = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  if (loading) return <Loading msg="Loading cameras…" />

  const activeCount = cameras.filter(c => c.status === 'active').length

  const getUcColor = (cam) => {
    const uc = USE_CASES.find(u => u.id === (cam.useCase || cam.enabled_usecases?.[0]))
    return uc ? uc.color : '#2563eb'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Camera Explorer
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
            {filtered.length} camera{filtered.length !== 1 ? 's' : ''} · {activeCount} active
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-3)' }} />
            <input 
              type="text" 
              placeholder="Search cameras..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: '#fff', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '7px 12px 7px 30px', fontSize: 13, borderRadius: 'var(--radius-sm)',
                width: 200, boxShadow: 'var(--shadow-sm)', outline: 'none'
              }}
            />
          </div>
          
          <select value={ucFilter} onChange={e => { setUcFilter(e.target.value); if (!useCaseId) setSelectedCard(null) }} style={{
            background: '#fff', border: '1px solid var(--border)', color: 'var(--text)',
            padding: '7px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)',
            fontWeight: 500, boxShadow: 'var(--shadow-sm)',
          }}>
            <option value="all">All Use Cases</option>
            {USE_CASES.map(u => <option key={u.id} value={u.id}>{u.emoji} {u.label}</option>)}
          </select>
          <select value={stFilter} onChange={e => setStFilter(e.target.value)} style={{
            background: '#fff', border: '1px solid var(--border)', color: 'var(--text)',
            padding: '7px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)',
            fontWeight: 500, boxShadow: 'var(--shadow-sm)',
          }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="offline">Offline</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Camera grid */}
      {filtered.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center',
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', color: 'var(--text-3)', fontSize: 13,
        }}>No cameras match your filters</div>
      ) : (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {paginatedCameras.map(cam => {
            const isSelected = selectedCard === cam.id
            const ucColor = getUcColor(cam)

            return (
              <div key={cam.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <MiniCanvas 
                  camera={cam} 
                  onClick={() => {
                    // Navigate directly to the specialized Safety Center layout page
                    const activeUc = useCaseId || ucFilter
                    if (['traffic', 'people_count', 'crowd_alert', 'intrusion'].includes(activeUc)) {
                      nav(`/camera/${cam.id}/${activeUc}`)
                    } else if (activeUc === 'all') {
                      // If on "All Use Cases", go to the camera's primary/first model
                      const primaryUc = cam.enabled_usecases?.[0]
                      if (primaryUc && ['traffic', 'people_count', 'crowd_alert', 'intrusion'].includes(primaryUc)) {
                        nav(`/camera/${cam.id}/${primaryUc}`)
                      } else {
                        nav(`/camera/${cam.id}`)
                      }
                    } else {
                      setSelectedCard(isSelected ? null : cam.id)
                    }
                  }} 
                  onDoubleClick={() => nav(`/camera/${cam.id}`)}
                />
                
                {/* Expandable Info Panel */}
                <div style={{
                  maxHeight: isSelected ? 300 : 0,
                  opacity: isSelected ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
                  marginTop: isSelected ? -6 : 0,
                  background: '#fff',
                  border: isSelected ? `1px solid ${ucColor}44` : 'none',
                  borderTop: 'none',
                  borderRadius: '0 0 var(--radius) var(--radius)',
                  boxShadow: isSelected ? `0 8px 24px ${ucColor}15` : 'none',
                  position: 'relative',
                  zIndex: 0
                }}>
                  {isSelected && (
                    <CameraStatsPanel 
                      cameraId={cam.id} 
                      ucColor={ucColor} 
                      onOpenCanvas={() => nav(`/camera/${cam.id}`)} 
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginTop: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
              Showing <b style={{ color: 'var(--text)' }}>{(page - 1) * ITEMS_PER_PAGE + 1}</b> to <b style={{ color: 'var(--text)' }}>{Math.min(page * ITEMS_PER_PAGE, filtered.length)}</b> of <b style={{ color: 'var(--text)' }}>{filtered.length}</b> cameras
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
        </>
      )}
    </div>
  )
}
