import { useState } from 'react'
import { useCameras } from '../hooks/useCameras.js'
import { useVehicleDetections } from '../hooks/useVehicleDetections.js'
import { Loading } from '../components/shared/index.jsx'
import { 
  Car, Search, Filter, RefreshCw, Eye, Download, X, 
  ChevronLeft, ChevronRight, ArrowUpDown, Calendar, HelpCircle 
} from 'lucide-react'

const T = {
  bg: '#f8f9fc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#1a202c',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  accent: '#4f6df5',
  accentLight: '#eef2ff',
  shadow: '0 4px 12px rgba(0,0,0,0.05)',
  radius: 12,
}

export default function VehicleLog() {
  const { cameras, loading: camsLoading } = useCameras()

  // State for filter inputs
  const [plateInput, setPlateInput] = useState('')
  const [cameraInput, setCameraInput] = useState('')
  const [vehicleTypeInput, setVehicleTypeInput] = useState('All')
  const [directionInput, setDirectionInput] = useState('both')
  
  // Set start of today and end of today as defaults
  const [startTimeInput, setStartTimeInput] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  })
  const [endTimeInput, setEndTimeInput] = useState(() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d.toISOString().slice(0, 16)
  })

  // Applied filters state (which actually triggers fetch)
  const [appliedFilters, setAppliedFilters] = useState({
    plate: '',
    cameraId: '',
    vehicleType: 'All',
    direction: 'both',
    startTime: '',
    endTime: '',
    page: 1,
    pageSize: 20,
  })

  // Detail Modal state
  const [viewingDetection, setViewingDetection] = useState(null)

  // Fetch using the hook
  const { detections, total, stats, loading, error, refetch } = useVehicleDetections(appliedFilters)

  // Handlers
  const handleSearch = (e) => {
    if (e) e.preventDefault()
    setAppliedFilters(prev => ({
      ...prev,
      plate: plateInput,
      cameraId: cameraInput,
      vehicleType: vehicleTypeInput,
      direction: directionInput,
      startTime: startTimeInput,
      endTime: endTimeInput,
      page: 1, // reset page to 1 on new search
    }))
  }

  const handleClear = () => {
    setPlateInput('')
    setCameraInput('')
    setVehicleTypeInput('All')
    setDirectionInput('both')
    
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    
    setStartTimeInput(start.toISOString().slice(0, 16))
    setEndTimeInput(end.toISOString().slice(0, 16))

    setAppliedFilters({
      plate: '',
      cameraId: '',
      vehicleType: 'All',
      direction: 'both',
      startTime: '',
      endTime: '',
      page: 1,
      pageSize: 20,
    })
  }

  const handlePageChange = (newPage) => {
    setAppliedFilters(prev => ({
      ...prev,
      page: newPage
    }))
  }

  const handleDownload = (e, d) => {
    e.stopPropagation()
    if (!d.imageUrl) return
    const link = document.createElement('a')
    link.href = d.imageUrl
    link.download = `vehicle_${d.id}.jpg`
    link.click()
  }

  const totalPages = Math.ceil(total / appliedFilters.pageSize) || 1

  if (camsLoading) return <Loading msg="Synchronizing Node Directory..." />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      
      {/* DETAIL MODAL */}
      {viewingDetection && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', 
            zIndex: 1000, display: 'flex', alignItems: 'center', 
            justifyContent: 'center', backdropFilter: 'blur(8px)' 
          }} 
          onClick={() => setViewingDetection(null)}
        >
          <div 
            style={{ 
              background: '#fff', borderRadius: 20, width: '92%', 
              maxWidth: 960, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Car size={20} style={{ color: 'var(--accent)' }} /> Vehicle Crossing Evidence
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>
                  ID: {viewingDetection.id} | Camera: {viewingDetection.cameraName || viewingDetection.cameraId}
                </div>
              </div>
              <button 
                onClick={() => setViewingDetection(null)} 
                style={{ background: '#f5f5f5', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', minHeight: 400 }}>
              {/* Image Column */}
              <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {viewingDetection.imageUrl ? (
                  <img src={viewingDetection.imageUrl} style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain' }} alt="Vehicle snapshot" />
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>No snapshot available</div>
                )}
              </div>
              
              {/* Metadata Details Column */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '1px solid #f1f5f9', background: '#fafbfe' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vehicle Properties</span>
                  
                  {[
                    { label: 'License Plate', value: viewingDetection.plateNumber || 'N/A (ANPR Pending)', highlight: !viewingDetection.plateNumber },
                    { label: 'Vehicle Type', value: viewingDetection.vehicleType ? viewingDetection.vehicleType.toUpperCase() : 'UNKNOWN' },
                    { label: 'Direction', value: viewingDetection.direction ? viewingDetection.direction.toUpperCase() : 'UNKNOWN', isDir: true },
                    { label: 'Camera Name', value: viewingDetection.cameraName || 'Unknown' },
                    { label: 'Track ID', value: viewingDetection.trackId ?? 'N/A' },
                    { label: 'Crossing Timestamp', value: new Date(viewingDetection.timestamp).toLocaleString() },
                  ].map((item, idx) => (
                    <div key={idx} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{item.label}</div>
                      <div style={{ 
                        fontSize: 14, 
                        fontWeight: 700, 
                        color: item.highlight ? 'var(--text-3)' : 'var(--text)',
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        {item.isDir && (
                          <span style={{ 
                            width: 8, height: 8, borderRadius: '50%', 
                            background: item.value.toLowerCase() === 'entering' ? '#22c55e' : '#f59e0b'
                          }} />
                        )}
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  {viewingDetection.imageUrl && (
                    <button 
                      onClick={(e) => handleDownload(e, viewingDetection)} 
                      style={{ 
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, 
                        background: 'var(--accent)', color: '#fff', border: 'none', padding: '12px 20px', 
                        borderRadius: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' 
                      }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                    >
                      <Download size={16} /> DOWNLOAD JPEG
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Vehicle Detection Log
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
            Real-time verification log of vehicle line crossings and camera forensic captures
          </p>
        </div>
        <button 
          onClick={() => refetch()} 
          style={{ 
            background: '#fff', border: '1px solid var(--border)', padding: '10px 16px', 
            borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, 
            fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)' 
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Log
        </button>
      </div>

      {/* KPI TILES ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Crossings', value: stats.total, border: 'var(--accent)', icon: Car },
          { label: 'Entering', value: stats.entering, border: '#22c55e', icon: ArrowUpDown },
          { label: 'Exiting', value: stats.exiting, border: '#f59e0b', icon: ArrowUpDown },
        ].map((tile, idx) => (
          <div 
            key={idx} 
            style={{
              background: '#fff', border: '1px solid var(--border)',
              borderRadius: 16, padding: '20px 24px',
              boxShadow: T.shadow, borderTop: `3px solid ${tile.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                {tile.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)' }}>
                {tile.value}
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, color: tile.border }}>
              <tile.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* FILTER CONTROL CARD */}
      <form onSubmit={handleSearch} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: T.shadow }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Plate Search
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
              <input 
                type="text" 
                placeholder="License plate..." 
                value={plateInput} 
                onChange={e => setPlateInput(e.target.value)} 
                style={{ 
                  width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', 
                  padding: '9px 12px 9px 34px', borderRadius: 10, fontSize: 12, outline: 'none', fontWeight: 600, color: 'var(--text)' 
                }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Camera Source
            </label>
            <select 
              value={cameraInput} 
              onChange={e => setCameraInput(e.target.value)} 
              style={{ 
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '9px 12px', fontSize: 12, borderRadius: 10, outline: 'none', fontWeight: 600 
              }}
            >
              <option value="">All Cameras</option>
              {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vehicle Type
            </label>
            <select 
              value={vehicleTypeInput} 
              onChange={e => setVehicleTypeInput(e.target.value)} 
              style={{ 
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '9px 12px', fontSize: 12, borderRadius: 10, outline: 'none', fontWeight: 600 
              }}
            >
              <option value="All">All Types</option>
              <option value="car">Car</option>
              <option value="truck">Truck</option>
              <option value="bus">Bus</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="bicycle">Bicycle</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Direction
            </label>
            <select 
              value={directionInput} 
              onChange={e => setDirectionInput(e.target.value)} 
              style={{ 
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '9px 12px', fontSize: 12, borderRadius: 10, outline: 'none', fontWeight: 600 
              }}
            >
              <option value="both">Both</option>
              <option value="entering">Entering</option>
              <option value="exiting">Exiting</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Start Time
            </label>
            <input 
              type="datetime-local" 
              value={startTimeInput} 
              onChange={e => setStartTimeInput(e.target.value)} 
              style={{ 
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '8px 12px', fontSize: 12, borderRadius: 10, outline: 'none', fontWeight: 600 
              }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              End Time
            </label>
            <input 
              type="datetime-local" 
              value={endTimeInput} 
              onChange={e => setEndTimeInput(e.target.value)} 
              style={{ 
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '8px 12px', fontSize: 12, borderRadius: 10, outline: 'none', fontWeight: 600 
              }} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
          <button 
            type="button" 
            onClick={handleClear} 
            style={{ 
              background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', 
              padding: '10px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' 
            }}
          >
            Clear Filters
          </button>
          <button 
            type="submit" 
            style={{ 
              background: 'var(--accent)', color: '#fff', border: 'none', 
              padding: '10px 24px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79, 109, 245, 0.2)'
            }}
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* RESULTS TABLE */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 20, boxShadow: T.shadow, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <tr>
                {['Capture Frame', 'License Plate', 'Type', 'Direction', 'Camera Source', 'Timestamp', 'Action'].map(h => (
                  <th key={h} style={{ padding: '14px 24px', textAlign: 'left', fontSize: 11, color: T.textMuted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 60, textAlign: 'center' }}>
                    <Loading msg="Querying records..." />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>
                    Error loading detections: {error}
                  </td>
                </tr>
              ) : detections.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 60, textAlign: 'center', color: T.textMuted, fontWeight: 500 }}>
                    No vehicle crossing logs found.
                  </td>
                </tr>
              ) : (
                detections.map((det) => (
                  <tr 
                    key={det.id} 
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s ease' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fcfdfe'} 
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div 
                        onClick={() => setViewingDetection(det)}
                        style={{
                          width: 120, height: 68, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden',
                          position: 'relative', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.2s'
                        }}
                      >
                        {det.imageUrl ? (
                          <img src={det.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Thumbnail" />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 9, fontWeight: 700 }}>NO FRAME</div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 800, color: 'var(--text)', fontSize: 13 }}>
                      {det.plateNumber ? (
                        <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                          {det.plateNumber}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, fontStyle: 'italic' }}>
                          Pending ANPR
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, color: 'var(--text-2)', textTransform: 'capitalize' }}>
                      {det.vehicleType || 'unknown'}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span 
                        style={{ 
                          fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                          background: det.direction === 'entering' ? '#f0fdf4' : '#fffbeb',
                          border: `1px solid ${det.direction === 'entering' ? '#bbf7d0' : '#fde68a'}`,
                          color: det.direction === 'entering' ? '#16a34a' : '#d97706',
                          textTransform: 'uppercase'
                        }}
                      >
                        {det.direction}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                        {det.cameraName || det.cameraId}
                      </div>
                      <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>
                        ID: {det.cameraId}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>
                      {new Date(det.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          onClick={() => setViewingDetection(det)} 
                          style={{ 
                            background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '8px 12px', 
                            borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--text)', cursor: 'pointer', 
                            display: 'flex', alignItems: 'center', gap: 4 
                          }}
                        >
                          <Eye size={12} /> Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {!loading && detections.length > 0 && (
          <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
              Showing {((appliedFilters.page - 1) * appliedFilters.pageSize) + 1} - {Math.min(appliedFilters.page * appliedFilters.pageSize, total)} of {total} records
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button 
                disabled={appliedFilters.page === 1}
                onClick={() => handlePageChange(appliedFilters.page - 1)}
                style={{ 
                  background: appliedFilters.page === 1 ? 'transparent' : '#fff', 
                  border: '1px solid var(--border)', padding: 6, borderRadius: 8, 
                  cursor: appliedFilters.page === 1 ? 'not-allowed' : 'pointer', display: 'flex',
                  color: appliedFilters.page === 1 ? 'var(--text-muted)' : 'var(--text)'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
                Page {appliedFilters.page} of {totalPages}
              </span>
              <button 
                disabled={appliedFilters.page === totalPages}
                onClick={() => handlePageChange(appliedFilters.page + 1)}
                style={{ 
                  background: appliedFilters.page === totalPages ? 'transparent' : '#fff', 
                  border: '1px solid var(--border)', padding: 6, borderRadius: 8, 
                  cursor: appliedFilters.page === totalPages ? 'not-allowed' : 'pointer', display: 'flex',
                  color: appliedFilters.page === totalPages ? 'var(--text-muted)' : 'var(--text)'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
