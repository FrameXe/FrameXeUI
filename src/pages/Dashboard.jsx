import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Camera, Activity, AlertTriangle, Users, Zap, Shield, ChevronRight, 
  Sparkles, Flame, ShieldAlert, Car, Search, Maximize2, ArrowUpRight,
  Cpu, Radio, Eye, BarChart3, Bell, SlidersHorizontal, CheckCircle2, Video
} from 'lucide-react'
import { useCameras } from '../hooks/useCameras.js'
import { useAllAlerts } from '../hooks/useAlerts.js'
import { USE_CASES } from '../constants/useCases.js'
import { Loading, SEV_STYLE } from '../components/shared/index.jsx'
import { useAuthStore } from '../store/index.js'
import MiniCanvas from '../components/camera/MiniCanvas.jsx'
import HistoricalAnalytics from '../components/HistoricalAnalytics.jsx'

const UC_META = {
  people_count: { icon: Users, tag: 'OCCUPANCY', label: 'People Counting', color: '#6366f1' },
  traffic: { icon: Car, tag: 'VEHICLES', label: 'Traffic Flow', color: '#0ea5e9' },
  intrusion: { icon: ShieldAlert, tag: 'PERIMETER', label: 'Intrusion Detection', color: '#ef4444' },
  crowd_alert: { icon: AlertTriangle, tag: 'DENSITY', label: 'Crowd Intelligence', color: '#f59e0b' },
  vehicle_speed: { icon: Zap, tag: 'SPEED', label: 'Speed Enforcement', color: '#10b981' },
  fire_detection: { icon: Flame, tag: 'THERMAL', label: 'Fire & Smoke', color: '#f97316' },
}

export default function Dashboard() {
  const nav = useNavigate()
  const { cameras, loading } = useCameras()
  const { alerts, unread } = useAllAlerts(cameras)
  const user = useAuthStore(s => s.user)
  const allowedUsecases = user?.allowedUsecases || []

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSuite, setSelectedSuite] = useState('all')

  const active = cameras.filter(c => c.status === 'active').length
  const errors = cameras.filter(c => c.status === 'error').length
  const health = cameras.length ? Math.round(active / cameras.length * 100) : 0

  if (loading && cameras.length === 0) return <Loading msg="Loading Feeds & Intelligence..." />

  const ucGroups = {}
  cameras.forEach(cam => {
    (cam.enabled_usecases || [cam.useCase] || []).forEach(uc => {
      if (!ucGroups[uc]) ucGroups[uc] = []
      ucGroups[uc].push(cam)
    })
  })

  /* Sort alerts by time desc and get top 8 unacknowledged */
  const recentAlerts = alerts
    .filter(a => !a.acknowledged)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8)

  // Filter cameras based on search and selected suite
  const filteredCameras = cameras.filter(cam => {
    const matchesSearch = !searchQuery || 
      (cam.name || cam.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cam.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cam.ip || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false
    if (selectedSuite === 'all') return true

    const camUcs = cam.enabled_usecases || [cam.useCase] || []
    return camUcs.includes(selectedSuite)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24 }}>

      {/* ── TOP HEADER: TITLE ON LEFT, TELEMETRY & ACTIONS ON RIGHT ── */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        flexWrap: 'wrap', gap: 10 
      }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-3)', fontWeight: 500 }}>
            Unified live video feeds, real-time security alerts, and forensic intelligence overview.
          </p>
        </div>

        {/* Right side: Telemetry indicators & Video Matrix Button in same line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          
          {/* Health Indicator Pill */}
          <button
            onClick={() => nav('/diagnostics')}
            title="Click to inspect Diagnostics & System Telemetry"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', border: '1px solid var(--ai-emerald-border)',
              padding: '4px 10px', borderRadius: 16, cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--ai-emerald)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--ai-emerald-border)'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <div className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ai-emerald)' }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text)' }}>
              System Health: <span style={{ color: 'var(--ai-emerald)' }}>{health}%</span>
            </span>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)' }}>
              {errors > 0 ? `(${errors} errors)` : '(Optimal)'}
            </span>
          </button>

          {/* Threats Indicator Pill */}
          <button
            onClick={() => nav('/events')}
            title="Click to inspect Live Security Events & Alerts"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', border: `1px solid ${unread > 0 ? 'var(--ai-rose-border)' : 'var(--ai-emerald-border)'}`,
              padding: '4px 10px', borderRadius: 16, cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = unread > 0 ? 'var(--ai-rose)' : 'var(--ai-emerald)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = unread > 0 ? 'var(--ai-rose-border)' : 'var(--ai-emerald-border)'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <div className="live-dot" style={{ 
              width: 6, height: 6, borderRadius: '50%', 
              background: unread > 0 ? 'var(--ai-rose)' : 'var(--ai-emerald)' 
            }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text)' }}>
              Threats: <span style={{ color: unread > 0 ? 'var(--ai-rose)' : 'var(--ai-emerald)' }}>{unread}</span>
            </span>
            <span style={{ 
              fontSize: 9.5, fontWeight: 700, 
              color: unread > 0 ? 'var(--ai-rose)' : 'var(--text-3)' 
            }}>
              {unread > 0 ? 'Action Req' : 'Secured'}
            </span>
          </button>

          {/* Prominent Video Matrix Button */}
          <button
            onClick={() => nav('/cameras')}
            title="Open Full Multi-Grid Video Matrix"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
              color: '#ffffff', border: 'none',
              padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
              fontSize: 11, fontWeight: 800, 
              boxShadow: '0 2px 10px rgba(6,182,212,0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <Maximize2 size={13} />
            <span>VIDEO MATRIX →</span>
          </button>
        </div>
      </div>

      {/* ── INTELLIGENCE SUITES (INDIGO / VIOLET PARTITIONED PANEL) ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: '3px solid #6366f1',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 2px 12px rgba(99,102,241,0.05)'
      }}>
        
        {/* Panel Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6366f1'
            }}>
              <Sparkles size={15} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  Intelligence Suites
                </h2>
                <span className="ai-badge" style={{
                  fontSize: 8.5, padding: '1px 6px',
                  background: 'rgba(99,102,241,0.12)', color: '#6366f1',
                  border: '1px solid rgba(99,102,241,0.3)'
                }}>
                  {USE_CASES.filter(uc => allowedUsecases.includes(uc.id)).length} SUITES ACTIVE
                </span>
              </div>
              <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                Active vision intelligence pipelines, live feed allocation, and analytics models.
              </p>
            </div>
          </div>

          {/* All Feeds Reset Filter */}
          <button
            onClick={() => setSelectedSuite('all')}
            style={{
              background: selectedSuite === 'all' ? 'linear-gradient(135deg, #6366f1, #3b82f6)' : 'var(--surface-2)',
              color: selectedSuite === 'all' ? '#fff' : 'var(--text)',
              border: `1px solid ${selectedSuite === 'all' ? '#6366f1' : 'var(--border)'}`,
              borderRadius: 6, padding: '4px 10px',
              fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
              boxShadow: selectedSuite === 'all' ? '0 2px 8px rgba(99,102,241,0.3)' : 'var(--shadow-sm)',
              transition: 'all 0.15s ease'
            }}
          >
            Show All Feeds ({cameras.length})
          </button>
        </div>

        {/* Intelligence Suites Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 8
        }}>
          {USE_CASES.filter(uc => allowedUsecases.includes(uc.id)).map(uc => {
            const ucCams = ucGroups[uc.id] || []
            const meta = UC_META[uc.id] || { icon: Sparkles, color: uc.color }
            const IconComponent = meta.icon
            const isSelected = selectedSuite === uc.id

            return (
              <div
                key={uc.id}
                style={{
                  background: isSelected ? `${uc.color}15` : 'var(--surface-2)',
                  border: `1px solid ${isSelected ? uc.color : 'var(--border)'}`,
                  borderRadius: 8,
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  borderLeft: `3px solid ${uc.color}`
                }}
                onClick={() => setSelectedSuite(isSelected ? 'all' : uc.id)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = uc.color
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.borderLeftColor = uc.color
                  }
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 6,
                    background: `${uc.color}20`, color: uc.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <IconComponent size={13} />
                  </div>
                  <div style={{ textAlign: 'left', minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {uc.label}
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-3)', fontWeight: 600, marginTop: 1 }}>
                      <span style={{ color: uc.color, fontWeight: 800 }}>{ucCams.length}</span> feeds
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    nav(`/use-case/${uc.id}`)
                  }}
                  title={`Open analytics for ${uc.label}`}
                  style={{
                    width: 22, height: 22, borderRadius: 5,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    color: uc.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s ease', flexShrink: 0
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = uc.color
                    e.currentTarget.style.color = '#fff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--surface)'
                    e.currentTarget.style.color = uc.color
                  }}
                >
                  <ArrowUpRight size={11} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── SECTION 1: LIVE VIDEO FEEDS & STREAMS (CYAN / BLUE HIGH-TECH PARTITION) ── */}
      <div style={{ 
        background: 'var(--surface)', 
        border: '1px solid var(--border)', 
        borderTop: '3px solid #06b6d4',
        borderRadius: 12, 
        padding: '12px 14px',
        display: 'flex', 
        flexDirection: 'column', 
        gap: 10,
        boxShadow: '0 2px 12px rgba(6,182,212,0.05)'
      }}>
        
        {/* Section Header with Quick Actions */}
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#06b6d4'
            }}>
              <Video size={15} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  Live Video Feeds & Streams
                </h2>
                <span className="ai-badge ai-badge-cyan" style={{ fontSize: 8.5, padding: '1px 6px' }}>
                  {active} ONLINE
                </span>
              </div>
              <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                Showing {filteredCameras.length} of {cameras.length} active feeds with live stream decoding.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: 190 }}>
              <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '4px 10px 4px 24px',
                  fontSize: 10.5, background: 'var(--surface-2)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  color: 'var(--text)', outline: 'none'
                }}
              />
            </div>

            {/* Direct Open Video Matrix Button */}
            <button
              onClick={() => nav('/cameras')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
                color: '#fff', border: 'none',
                padding: '4px 10px', borderRadius: 6,
                fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(6,182,212,0.3)', transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <span>MULTI-GRID VIEW</span>
              <ArrowUpRight size={11} />
            </button>
          </div>
        </div>

        {/* Camera Boxes Grid: Cam 1, Cam 2, Cam 3... with Cam ID */}
        {filteredCameras.length === 0 ? (
          <div style={{ 
            padding: 24, background: 'var(--surface-2)', border: '1px dashed var(--border)', 
            borderRadius: 8, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 
          }}>
            <Camera size={24} style={{ margin: '0 auto 6px', color: 'var(--text-3)' }} />
            No camera feeds found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12
          }}>
            {filteredCameras.map((cam, idx) => {
              const isActive = cam.status === 'active'
              const camUcs = cam.enabled_usecases || [cam.useCase] || []
              const camNum = idx + 1

              return (
                <div
                  key={cam.id}
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: `3px solid ${isActive ? '#06b6d4' : 'var(--border)'}`,
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#06b6d4'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.borderTopColor = isActive ? '#06b6d4' : 'var(--border)'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                  }}
                >
                  {/* Top Header: CAM 1, CAM 2... with Cam ID & Location */}
                  <div style={{
                    padding: '8px 12px',
                    background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span style={{
                        background: '#06b6d4',
                        color: '#fff',
                        fontSize: 9.5,
                        fontWeight: 900,
                        padding: '2px 7px',
                        borderRadius: 5,
                        letterSpacing: '0.04em',
                        flexShrink: 0
                      }}>
                        CAM {camNum}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span 
                            onClick={() => nav(`/camera/${cam.id}/${cam.useCase || 'people_count'}`)}
                            title={cam.name || `Camera ${camNum}`}
                            style={{ 
                              fontSize: 12, fontWeight: 800, color: 'var(--text)', 
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              cursor: 'pointer' 
                            }}
                          >
                            {cam.name || `Camera ${camNum}`}
                          </span>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>
                            ({cam.id})
                          </span>
                        </div>
                        <span style={{ fontSize: 9.5, color: 'var(--text-3)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          📍 {cam.location || 'Zone Entrance'}
                        </span>
                      </div>
                    </div>

                    <span className={isActive ? 'ai-badge ai-badge-emerald' : 'ai-badge'} style={{ fontSize: 8.5, padding: '2px 6px', flexShrink: 0 }}>
                      {isActive ? '● LIVE' : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Video Canvas Preview Window */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16/9',
                      background: '#000',
                      cursor: 'pointer',
                      overflow: 'hidden'
                    }}
                    onClick={() => nav(`/camera/${cam.id}/${cam.useCase || 'people_count'}`)}
                  >
                    <MiniCanvas
                      camera={cam}
                      activeUseCase={cam.useCase || 'people_count'}
                      hideInfo={true}
                    />
                  </div>

                  {/* Bottom Footer: Pipelines & View Button - NO RTSP STRING */}
                  <div style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    background: 'var(--surface-2)',
                    borderTop: '1px solid var(--border)',
                    marginTop: 'auto'
                  }}>
                    {/* Active Pipelines */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
                      {camUcs.length === 0 ? (
                        <span style={{ fontSize: 9, color: 'var(--text-3)' }}>No suites</span>
                      ) : (
                        camUcs.slice(0, 3).map(ucId => {
                          const meta = UC_META[ucId]
                          if (!meta) return null
                          const IconComp = meta.icon
                          return (
                            <span
                              key={ucId}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                fontSize: 8, fontWeight: 800,
                                padding: '1.5px 5px', borderRadius: 4,
                                background: `${meta.color}15`,
                                border: `1px solid ${meta.color}35`,
                                color: meta.color
                              }}
                              title={meta.label}
                            >
                              <IconComp size={9} />
                              <span>{meta.label}</span>
                            </span>
                          )
                        })
                      )}
                      {camUcs.length > 3 && (
                        <span style={{ fontSize: 8.5, color: 'var(--text-3)', fontWeight: 700 }}>
                          +{camUcs.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => nav(`/camera-management`)}
                        title="Configure Camera"
                        style={{
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          color: 'var(--text-3)', padding: '3px 6px', borderRadius: 5,
                          fontSize: 9, fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = 'var(--text)'
                          e.currentTarget.style.borderColor = 'var(--accent)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = 'var(--text-3)'
                          e.currentTarget.style.borderColor = 'var(--border)'
                        }}
                      >
                        <SlidersHorizontal size={10} />
                      </button>

                      <button
                        onClick={() => nav(`/camera/${cam.id}/${cam.useCase || 'people_count'}`)}
                        style={{
                          background: 'var(--surface)', border: '1px solid #06b6d4',
                          color: '#06b6d4', padding: '3px 8px', borderRadius: 5,
                          fontSize: 9, fontWeight: 800, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 3,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#06b6d4'
                          e.currentTarget.style.color = '#fff'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'var(--surface)'
                          e.currentTarget.style.color = '#06b6d4'
                        }}
                      >
                        <Eye size={10} />
                        <span>View</span>
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* ── SECTION 2: LIVE SECURITY INCIDENTS & THREAT RADAR (ROSE / CRIMSON ALERT PARTITION) ── */}
      <div style={{ 
        background: 'var(--surface)', 
        border: '1px solid var(--border)', 
        borderTop: '3px solid #f43f5e',
        borderRadius: 12, 
        padding: '12px 14px',
        display: 'flex', 
        flexDirection: 'column', 
        gap: 10,
        boxShadow: '0 2px 12px rgba(244,63,94,0.05)'
      }}>
        
        {/* Incidents Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#f43f5e'
            }}>
              <ShieldAlert size={15} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  Security Incidents & Threat Radar
                </h2>
                <span className={unread > 0 ? "ai-badge ai-badge-rose" : "ai-badge ai-badge-emerald"} style={{ fontSize: 8.5, padding: '1px 6px' }}>
                  {unread > 0 ? `${unread} PENDING ACTION` : 'PERIMETER SECURED'}
                </span>
              </div>
              <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                Real-time threat alerts, perimeter breaches, and automated vision model triggers.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => nav('/events')}
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--accent)', padding: '4px 10px', borderRadius: 6,
                fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)', transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              ALL SECURITY LOGS →
            </button>
          </div>
        </div>

        {/* Incidents Cards Grid */}
        {recentAlerts.length === 0 ? (
          <div style={{ 
            padding: 24, background: 'var(--surface-2)', border: '1px dashed var(--border)', 
            borderRadius: 8, textAlign: 'center', color: 'var(--text-3)', fontSize: 12,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
          }}>
            <div style={{ 
              width: 36, height: 36, borderRadius: 10, background: 'var(--ai-emerald-bg)', 
              color: 'var(--ai-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--ai-emerald-border)'
            }}>
              <Shield size={18} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Perimeter Fully Guarded</div>
            <div>No active threat alerts detected across camera feeds in the last cycle.</div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', 
            gap: 8 
          }}>
            {recentAlerts.map(a => {
              const s = SEV_STYLE[a.severity] || SEV_STYLE.medium
              const isCritical = a.severity === 'critical' || a.severity === 'high'

              return (
                <div
                  key={a.id}
                  onClick={() => nav(`/camera/${a.cameraId}/${a.usecase}`)}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    display: 'flex', gap: 10, cursor: 'pointer',
                    borderLeft: `3px solid ${isCritical ? '#f43f5e' : '#f59e0b'}`,
                    alignItems: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = isCritical ? '#f43f5e' : '#f59e0b'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.borderLeftColor = isCritical ? '#f43f5e' : '#f59e0b'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  {/* Snapshot thumbnail */}
                  <div style={{ 
                    width: 60, height: 38, borderRadius: 5, background: 'var(--surface)', 
                    flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border)',
                    position: 'relative'
                  }}>
                    {a.thumbnailUrl || a.fullResUrl ? (
                      <img
                        src={a.thumbnailUrl || a.fullResUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt="Incident"
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                      />
                    ) : null}
                    <div style={{
                      width: '100%', height: '100%', display: a.thumbnailUrl || a.fullResUrl ? 'none' : 'flex',
                      alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)'
                    }}>
                      <Camera size={14} />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.message}
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-3)', fontWeight: 600, marginTop: 1 }}>
                      {a.cameraName} · {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ 
                    padding: '2px 6px', borderRadius: 4, fontSize: 8, fontWeight: 900, 
                    height: 'fit-content', background: s.bg, border: `1px solid ${s.border}`, 
                    color: s.color, textTransform: 'uppercase', alignSelf: 'center', letterSpacing: '0.04em'
                  }}>
                    {a.severity}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* ── SECTION 3: HISTORICAL INTELLIGENCE (PURPLE / VIOLET PARTITION) ── */}
      <HistoricalAnalytics 
        extraAction={
          <button
            onClick={() => nav('/reports')}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--accent)', padding: '4px 10px', borderRadius: 6,
              fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)', transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            INTELLIGENCE LOGS →
          </button>
        }
      />

    </div>
  )
}