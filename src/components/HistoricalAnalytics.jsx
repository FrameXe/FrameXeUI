// NEW COMPONENT — renders below Dashboard content only
// Chart view: Bar chart, grouped by metric, colored by camera
// Table view: sortable, paginated (20 rows), only selected metric columns shown
// Empty state: "No data available" (not an error)
// Skeleton: show while isLoading === true
// DO NOT use any realtime data source

import { useState, useRef, useEffect } from 'react'
import {
  BarChart3, Table as TableIcon, Calendar, CheckSquare, Square,
  ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown, AlertCircle, Filter
} from 'lucide-react'
import { useHistoricalAnalytics, METRIC_OPTIONS, PAGE_SIZE } from '../hooks/useHistoricalAnalytics.js'

// Color palette for cameras in chart view
const CAMERA_COLORS = [
  '#4f6df5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b'
]

export default function HistoricalAnalytics() {
  const {
    cameras,
    camerasLoading,
    selectedMetrics,
    toggleMetric,
    selectedPeriod,
    changePeriod,
    selectedCameras,
    toggleCamera,
    selectAllCameras,
    viewMode,
    setViewMode,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dateValidationError,
    data,
    isFallback,
    sortedData,
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
    sortConfig,
    handleSort,
    loading,
  } = useHistoricalAnalytics()

  const [camDropdownOpen, setCamDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close camera dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setCamDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Camera selector trigger label rule:
  // "All Cameras" when all or none selected, "X Cameras Selected" when partial selection
  const cameraTriggerLabel = (() => {
    if (selectedCameras.length === 0 || (cameras.length > 0 && selectedCameras.length === cameras.length)) {
      return 'All Cameras'
    }
    return `${selectedCameras.length} Camera${selectedCameras.length > 1 ? 's' : ''} Selected`
  })()

  // Value formatting helper (returns '--' if null/undefined, never '0' for missing)
  const formatVal = (val) => {
    if (val === null || val === undefined) return '--'
    if (typeof val === 'number') return val.toLocaleString()
    return val
  }

  // Vehicle types inline text formatting: "Car: 800, Truck: 300, Bike: 140"
  const formatVehicleTypes = (vt) => {
    if (!vt || typeof vt !== 'object' || Object.keys(vt).length === 0) return '--'
    return Object.entries(vt)
      .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${typeof v === 'number' ? v.toLocaleString() : v}`)
      .join(', ')
  }

  // Congestion pill badge rendering
  const renderCongestionBadge = (level) => {
    if (!level) return '--'
    const l = String(level).toLowerCase()
    let bg = '#f1f5f9', color = '#64748b', border = '#cbd5e1'
    if (l === 'low') {
      bg = '#f0fdf4'; color = '#15803d'; border = '#bbf7d0'
    } else if (l === 'medium') {
      bg = '#fefce8'; color = '#a16207'; border = '#fef08a'
    } else if (l === 'high') {
      bg = '#fef2f2'; color = '#b91c1c'; border = '#fecaca'
    }
    return (
      <span style={{
        background: bg, color: color, border: `1px solid ${border}`,
        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 800,
        textTransform: 'uppercase', display: 'inline-block'
      }}>
        {l}
      </span>
    )
  }

  // Unique list of cameras present in the response data (for chart legend color mapping)
  const activeCamIds = Array.from(new Set(data.map(d => d.camera_id || d.camera_name || 'cam'))).slice(0, 8)
  const camColorMap  = Object.fromEntries(activeCamIds.map((id, i) => [id, CAMERA_COLORS[i % CAMERA_COLORS.length]]))

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 20,
      padding: '28px', boxShadow: 'var(--shadow-sm)', marginTop: 32, display: 'flex',
      flexDirection: 'column', gap: 24
    }}>
      {/* ── Header & View Toggle ───────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={22} style={{ color: 'var(--accent)' }} /> Historical Intelligence & Analytics
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
            Deep-dive multi-metric analytics and historical trend reports across nodes.
          </p>
        </div>

        {/* Fallback notice — only shown when real endpoint is unavailable */}
        {isFallback && data.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8,
            background: '#fffbeb', border: '1px solid #fde68a',
            fontSize: 11, fontWeight: 600, color: '#92400e',
          }}>
            <AlertCircle size={13} style={{ color: '#d97706', flexShrink: 0 }} />
            Estimated data — live historical endpoint not deployed yet. Deploy the updated backend to see real DB data.
          </div>
        )}

        {/* View Toggle */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setViewMode('chart')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
              fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
              background: viewMode === 'chart' ? '#fff' : 'transparent',
              color: viewMode === 'chart' ? 'var(--text)' : 'var(--text-3)',
              boxShadow: viewMode === 'chart' ? 'var(--shadow-sm)' : 'none',
              border: 'none',
            }}
          >
            📊 Chart
          </button>
          <button
            onClick={() => setViewMode('table')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
              fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
              background: viewMode === 'table' ? '#fff' : 'transparent',
              color: viewMode === 'table' ? 'var(--text)' : 'var(--text-3)',
              boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
              border: 'none',
            }}
          >
            📋 Table
          </button>
        </div>
      </div>

      {/* ── Filters Bar ───────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#f8fafc', padding: 18, borderRadius: 14, border: '1px solid var(--border)' }}>
        
        {/* Metric Selector Checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Metrics (At least 1 required)
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {METRIC_OPTIONS.map(m => {
              const selected = selectedMetrics.includes(m.id)
              const isOnlyOne = selectedMetrics.length === 1 && selected
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMetric(m.id)}
                  disabled={isOnlyOne}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 700, cursor: isOnlyOne ? 'not-allowed' : 'pointer',
                    background: selected ? `${m.color}15` : '#fff',
                    border: `1.5px solid ${selected ? m.color : 'var(--border)'}`,
                    color: selected ? m.color : 'var(--text-3)',
                    opacity: isOnlyOne ? 0.7 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: m.color, opacity: selected ? 1 : 0.4
                  }} />
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 2: Period Selector, Camera Selector, Custom Dates */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          
          {/* Period Selector Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>Time Period</span>
            <div style={{ display: 'flex', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 2 }}>
              {['daily', 'weekly', 'monthly', 'custom'].map(p => (
                <button
                  key={p}
                  onClick={() => changePeriod(p)}
                  style={{
                    padding: '6px 12px', fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                    background: selectedPeriod === p ? 'var(--accent)' : 'transparent',
                    color: selectedPeriod === p ? '#fff' : 'var(--text-2)',
                    border: 'none', textTransform: 'capitalize', transition: 'all 0.15s'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Multi-Select Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }} ref={dropdownRef}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>Camera Nodes</span>
            <button
              onClick={() => setCamDropdownOpen(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                background: '#fff', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 8,
                fontSize: 12, fontWeight: 700, color: 'var(--text)', cursor: 'pointer', minWidth: 160
              }}
            >
              <span>{cameraTriggerLabel}</span>
              <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />
            </button>

            {camDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
                background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
                boxShadow: 'var(--shadow)', padding: 8, width: 220, maxHeight: 240, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 4
              }}>
                {/* "All Cameras" option at top */}
                <div
                  onClick={selectAllCameras}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6,
                    cursor: 'pointer', fontSize: 12, fontWeight: 800, background: selectedCameras.length === 0 ? '#f1f5f9' : 'transparent'
                  }}
                >
                  {selectedCameras.length === 0 ? <CheckSquare size={14} color="var(--accent)" /> : <Square size={14} color="#cbd5e1" />}
                  <span>All Cameras</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />
                {cameras.map(cam => {
                  const camId = cam.id || cam.camera_id
                  const checked = selectedCameras.includes(camId)
                  return (
                    <div
                      key={camId}
                      onClick={() => toggleCamera(camId)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6,
                        cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text)'
                      }}
                    >
                      {checked ? <CheckSquare size={14} color="var(--accent)" /> : <Square size={14} color="#cbd5e1" />}
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cam.name || camId}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Date Range Picker (Custom Period Only) */}
          {selectedPeriod === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{
                    background: '#fff', border: `1px solid ${dateValidationError ? '#ef4444' : 'var(--border)'}`,
                    padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>End Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{
                    background: '#fff', border: `1px solid ${dateValidationError ? '#ef4444' : 'var(--border)'}`,
                    padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text)'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Date Validation Error Alert */}
        {dateValidationError && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <AlertCircle size={15} />
            <span>{dateValidationError}</span>
          </div>
        )}
      </div>

      {/* ── Content View (Chart vs Table) ────────────────────── */}
      {viewMode === 'chart' ? (
        /* ── CHART VIEW ─────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            /* Skeleton Loading for Chart */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '40px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ width: 140, height: 16, background: '#e2e8f0', borderRadius: 4 }} />
                <div style={{ width: 200, height: 16, background: '#e2e8f0', borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 20, justifyContent: 'space-around', paddingTop: 20 }}>
                {[60, 120, 80, 150, 90, 110, 140].map((h, i) => (
                  <div key={i} style={{ width: 40, height: h, background: '#cbd5e1', borderRadius: '6px 6px 0 0', opacity: 0.6 }} />
                ))}
              </div>
            </div>
          ) : data.length === 0 ? (
            /* Empty State */
            <div style={{ padding: '48px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed var(--border)', color: 'var(--text-3)', fontSize: 13, fontWeight: 600 }}>
              No data available for selected filters
            </div>
          ) : (
            /* Custom Grouped SVG / CSS Bar Chart */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Legend mapping camera → color */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>Camera Color Legend:</span>
                {activeCamIds.map(camId => {
                  const camObj = cameras.find(c => (c.id || c.camera_id) === camId)
                  const name = camObj?.name || camId
                  return (
                    <div key={camId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: camColorMap[camId] }} />
                      <span>{name}</span>
                    </div>
                  )
                })}
              </div>

              {/* Grouped Bar Chart Visualiser */}
              <div style={{
                background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '24px',
                display: 'flex', flexDirection: 'column', gap: 20
              }}>
                {selectedMetrics.map(metricId => {
                  const metricMeta = METRIC_OPTIONS.find(m => m.id === metricId)
                  const maxVal = Math.max(...data.map(d => Number(d[metricId] || d.count || 0)), 10)

                  return (
                    <div key={metricId} style={{ display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: metricMeta?.color || 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 14, borderRadius: 2, background: metricMeta?.color }} />
                        {metricMeta?.label}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: 16, overflowX: 'auto', padding: '10px 0' }}>
                        {data.map((item, idx) => {
                          const val = Number(item[metricId] ?? item.count ?? 0)
                          const heightPct = Math.min(100, Math.max(8, (val / maxVal) * 100))
                          const camId = item.camera_id || item.camera_name || 'cam'
                          const barColor = camColorMap[camId] || metricMeta?.color || 'var(--accent)'

                          return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 44, flex: 1 }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-2)' }}>
                                {val > 0 ? val.toLocaleString() : '--'}
                              </div>
                              <div style={{
                                width: '100%', height: `${heightPct}%`, background: barColor,
                                borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease'
                              }} />
                              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                                {item.date || item.period || `P${idx + 1}`}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── TABLE VIEW ─────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th onClick={() => handleSort('date')} style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Date/Period <ArrowUpDown size={12} /></div>
                    </th>
                    <th onClick={() => handleSort('camera_name')} style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Camera <ArrowUpDown size={12} /></div>
                    </th>
                    {selectedMetrics.includes('vehicle_count') && (
                      <th onClick={() => handleSort('vehicle_count')} style={{ padding: '14px 16px', color: '#0ea5e9', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Vehicle Count <ArrowUpDown size={12} /></div>
                      </th>
                    )}
                    {selectedMetrics.includes('people_count') && (
                      <th onClick={() => handleSort('people_count')} style={{ padding: '14px 16px', color: '#4f6df5', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>People Count <ArrowUpDown size={12} /></div>
                      </th>
                    )}
                    {selectedMetrics.includes('people_flow') && (
                      <>
                        <th onClick={() => handleSort('people_in')} style={{ padding: '14px 16px', color: '#10b981', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>People IN <ArrowUpDown size={12} /></div>
                        </th>
                        <th onClick={() => handleSort('people_out')} style={{ padding: '14px 16px', color: '#ef4444', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>People OUT <ArrowUpDown size={12} /></div>
                        </th>
                      </>
                    )}
                    {selectedMetrics.includes('vehicle_types') && (
                      <th style={{ padding: '14px 16px', color: '#8b5cf6', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                        Vehicle Types
                      </th>
                    )}
                    {selectedMetrics.includes('congestion') && (
                      <th onClick={() => handleSort('congestion_level')} style={{ padding: '14px 16px', color: '#f59e0b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Congestion <ArrowUpDown size={12} /></div>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    /* Skeleton Rows */
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px' }}><div style={{ width: 80, height: 14, background: '#f1f5f9', borderRadius: 4 }} /></td>
                        <td style={{ padding: '14px 16px' }}><div style={{ width: 120, height: 14, background: '#f1f5f9', borderRadius: 4 }} /></td>
                        {selectedMetrics.includes('vehicle_count') && <td style={{ padding: '14px 16px' }}><div style={{ width: 50, height: 14, background: '#f1f5f9', borderRadius: 4 }} /></td>}
                        {selectedMetrics.includes('people_count') && <td style={{ padding: '14px 16px' }}><div style={{ width: 50, height: 14, background: '#f1f5f9', borderRadius: 4 }} /></td>}
                        {selectedMetrics.includes('people_flow') && (
                          <>
                            <td style={{ padding: '14px 16px' }}><div style={{ width: 40, height: 14, background: '#f1f5f9', borderRadius: 4 }} /></td>
                            <td style={{ padding: '14px 16px' }}><div style={{ width: 40, height: 14, background: '#f1f5f9', borderRadius: 4 }} /></td>
                          </>
                        )}
                        {selectedMetrics.includes('vehicle_types') && <td style={{ padding: '14px 16px' }}><div style={{ width: 140, height: 14, background: '#f1f5f9', borderRadius: 4 }} /></td>}
                        {selectedMetrics.includes('congestion') && <td style={{ padding: '14px 16px' }}><div style={{ width: 60, height: 14, background: '#f1f5f9', borderRadius: 4 }} /></td>}
                      </tr>
                    ))
                  ) : paginatedData.length === 0 ? (
                    /* Empty Table State */
                    <tr>
                      <td colSpan={10} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600 }}>
                        No data available
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text)' }}>
                          {row.date || row.period || '--'}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-2)' }}>
                          {row.camera_name || row.camera_id || '--'}
                        </td>
                        {selectedMetrics.includes('vehicle_count') && (
                          <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0ea5e9' }}>
                            {formatVal(row.vehicle_count)}
                          </td>
                        )}
                        {selectedMetrics.includes('people_count') && (
                          <td style={{ padding: '14px 16px', fontWeight: 800, color: '#4f6df5' }}>
                            {formatVal(row.people_count)}
                          </td>
                        )}
                        {selectedMetrics.includes('people_flow') && (
                          <>
                            <td style={{ padding: '14px 16px', fontWeight: 800, color: '#10b981' }}>
                              {formatVal(row.people_in)}
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: 800, color: '#ef4444' }}>
                              {formatVal(row.people_out)}
                            </td>
                          </>
                        )}
                        {selectedMetrics.includes('vehicle_types') && (
                          <td style={{ padding: '14px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                            {formatVehicleTypes(row.vehicle_types)}
                          </td>
                        )}
                        {selectedMetrics.includes('congestion') && (
                          <td style={{ padding: '14px 16px' }}>
                            {renderCongestionBadge(row.congestion_level)}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!loading && sortedData.length > 0 && (
              <div style={{
                padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, sortedData.length)} of {sortedData.length} records
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
                      padding: '4px 8px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1, display: 'flex'
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
                      padding: '4px 8px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1, display: 'flex'
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
