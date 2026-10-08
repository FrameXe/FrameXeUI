import { useState } from 'react'
import { createPortal } from 'react-dom'
import { usePeopleDetections } from '../hooks/usePeopleDetections.js'
import { Loading } from '../components/shared/index.jsx'
import {
  Users, RefreshCw, Eye, Download, X,
  ChevronLeft, ChevronRight, ArrowUpDown
} from 'lucide-react'

const T = {
  bg:            'var(--bg)',
  card:          'var(--surface)',
  border:        'var(--border)',
  text:          'var(--text)',
  textSecondary: 'var(--text-2)',
  textMuted:     'var(--text-3)',
  accent:        'var(--accent)',
  shadow:        'var(--shadow)',
  radius:        12,
}

export default function PeopleLog() {
  // Filters — only pagination (no plate/vehicle_type/direction UI filters)
  const [appliedFilters, setAppliedFilters] = useState({
    page:     1,
    pageSize: 20,
  })

  // Detail modal state
  const [viewingDetection, setViewingDetection] = useState(null)

  // Fetch using the hook
  const { detections, total, stats, loading, error, refetch } = usePeopleDetections(appliedFilters)

  const handlePageChange = (newPage) => {
    setAppliedFilters(prev => ({ ...prev, page: newPage }))
  }

  const handleDownload = (e, d) => {
    e.stopPropagation()
    if (!d.imageUrl) return
    const link = document.createElement('a')
    link.href = d.imageUrl
    link.download = `person_${d.id}.jpg`
    link.click()
  }

  const totalPages = Math.ceil(total / appliedFilters.pageSize) || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>

      {/* DETAIL MODAL — rendered via portal so position:fixed works correctly */}
      {viewingDetection && createPortal(
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
              background: 'var(--surface)', borderRadius: 20, width: '96%',
              maxWidth: 860, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              border: '1px solid var(--border)', display: 'flex', flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={20} style={{ color: 'var(--accent)' }} /> Person Detection Evidence
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>
                  ID: {viewingDetection.id} | Camera: {viewingDetection.cameraName || viewingDetection.cameraId}
                </div>
              </div>
              <button
                onClick={() => setViewingDetection(null)}
                style={{ background: 'var(--surface-2)', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', display: 'flex', color: 'var(--text)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body: full frame + metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr', minHeight: 360 }}>
              {/* Full Frame */}
              <div style={{ background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRight: '1px solid #222' }}>
                <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, letterSpacing: '0.05em' }}>
                  CAPTURE FRAME
                </div>
                {viewingDetection.imageUrl ? (
                  <img src={viewingDetection.imageUrl} style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }} alt="Capture frame" />
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>No frame available</div>
                )}
              </div>

              {/* Metadata */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Detection Properties</span>

                  {[
                    { label: 'Direction', value: viewingDetection.direction ? viewingDetection.direction.toUpperCase() : 'UNKNOWN', isDir: true },
                    { label: 'Camera Name', value: viewingDetection.cameraName || 'Unknown' },
                    { label: 'Track ID', value: viewingDetection.trackId ?? 'N/A' },
                    { label: 'Timestamp', value: new Date(viewingDetection.timestamp).toLocaleString() },
                  ].map((item, idx) => (
                    <div key={idx} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{item.label}</div>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: 'var(--text)', marginTop: 4,
                        display: 'flex', alignItems: 'center', gap: 6
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

                {viewingDetection.imageUrl && (
                  <button
                    onClick={(e) => handleDownload(e, viewingDetection)}
                    style={{
                      marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 16px',
                      borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 11
                    }}
                    onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.9)'}
                    onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                  >
                    <Download size={14} /> DOWNLOAD CAPTURE
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      , document.body)}


      {/* HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            People Detection Log
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
            Real-time log of person detections and line crossings captured by cameras
          </p>
        </div>
        <button
          onClick={() => refetch()}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px 16px',
            borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--text)'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Log
        </button>
      </div>

      {/* KPI TILES ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Detections', value: stats.total,    border: 'var(--accent)', icon: Users },
          { label: 'Entering',         value: stats.entering, border: '#22c55e',        icon: ArrowUpDown },
          { label: 'Exiting',          value: stats.exiting,  border: '#f59e0b',        icon: ArrowUpDown },
        ].map((tile, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
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
            <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 12, color: tile.border }}>
              <tile.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* RESULTS TABLE */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: T.shadow, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                {['Capture Frame', 'Direction', 'Camera Source', 'Timestamp', 'Action'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, color: T.textMuted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 60, textAlign: 'center' }}>
                    <Loading msg="Querying records..." />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>
                    Error loading detections: {error}
                  </td>
                </tr>
              ) : detections.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 60, textAlign: 'center', color: T.textMuted, fontWeight: 500 }}>
                    No person detection logs found.
                  </td>
                </tr>
              ) : (
                detections.map((det) => (
                  <tr
                    key={det.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s ease' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Capture Frame Thumbnail */}
                    <td style={{ padding: '12px 16px' }}>
                      <div
                        onClick={() => setViewingDetection(det)}
                        style={{
                          width: 110, height: 64, background: 'var(--surface-2)', borderRadius: 8, overflow: 'hidden',
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

                    {/* Direction Badge */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                          background: det.direction === 'entering' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          border: `1px solid ${det.direction === 'entering' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          color: det.direction === 'entering' ? '#16a34a' : '#f59e0b',
                          textTransform: 'uppercase'
                        }}
                      >
                        {det.direction || '—'}
                      </span>
                    </td>

                    {/* Camera Source */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                        {det.cameraName || det.cameraId}
                      </div>
                      <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>
                        ID: {det.cameraId}
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>
                      {new Date(det.timestamp).toLocaleString()}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '12px 16px' }}>
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {!loading && detections.length > 0 && (
          <div style={{ padding: '16px 24px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
              Showing {((appliedFilters.page - 1) * appliedFilters.pageSize) + 1} – {Math.min(appliedFilters.page * appliedFilters.pageSize, total)} of {total} records
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                disabled={appliedFilters.page === 1}
                onClick={() => handlePageChange(appliedFilters.page - 1)}
                style={{
                  background: appliedFilters.page === 1 ? 'transparent' : 'var(--surface-2)',
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
                  background: appliedFilters.page === totalPages ? 'transparent' : 'var(--surface-2)',
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
