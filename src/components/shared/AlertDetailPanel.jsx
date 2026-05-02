import { useState, useEffect } from 'react'
import { X, Users, TrendingUp, Clock, AlertTriangle, Activity, MapPin, Camera } from 'lucide-react'
import { peopleAnalyticsAPI } from '../../services/api.js'
import { UC_MAP } from '../../constants/useCases.js'
import { SEV_COLOR } from './index.jsx'

const CAP_COLOR = { ok: '#00ff88', warning: '#ffd600', critical: '#ff3b3b' }
const CAP_LABEL = { ok: 'NORMAL', warning: 'CROWDED', critical: 'OVERCROWDED' }

export default function AlertDetailPanel({ alert, camera, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!alert || !camera) return
    setLoading(true)
    peopleAnalyticsAPI.get(camera.id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [alert?.id, camera?.id])

  if (!alert) return null

  const maxCount = data ? Math.max(...data.hourlyTimeline.map(h => h.count), 1) : 1

  return (
    <div className="alert-detail-overlay" onClick={onClose}>
      <div className="alert-detail-panel" onClick={e => e.stopPropagation()}>

        {/* ─── Close button ─── */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14, background: 'transparent',
          border: '1px solid #1e3040', color: '#4a6070', width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
        }}><X size={14} /></button>

        {/* ─── Header ─── */}
        <div style={{ paddingBottom: 16, borderBottom: '1px solid #0d1e2e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: SEV_COLOR[alert.severity],
              boxShadow: `0 0 8px ${SEV_COLOR[alert.severity]}`,
            }} />
            <span style={{
              fontSize: 10, color: SEV_COLOR[alert.severity],
              letterSpacing: 2, fontWeight: 'bold',
            }}>{alert.severity?.toUpperCase()}</span>
          </div>
          <div style={{ fontSize: 14, color: '#c8d8e8', fontWeight: 'bold', lineHeight: 1.4 }}>{alert.message}</div>
          <div style={{ fontSize: 10, color: '#2a4050', marginTop: 6 }}>
            {new Date(alert.timestamp).toLocaleString()}
          </div>
        </div>

        {/* ─── Camera Info ─── */}
        <div style={{
          background: '#060d18', border: '1px solid #0d2030',
          padding: 16, marginTop: 16,
        }}>
          <div style={{ fontSize: 9, color: '#2a4050', letterSpacing: 2, marginBottom: 12 }}>ASSIGNED CAMERA</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Camera size={16} style={{ color: '#00cfff', opacity: 0.6 }} />
            <span style={{ fontSize: 14, color: '#c8d8e8', fontWeight: 'bold' }}>{camera?.name || alert.cameraName}</span>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: camera?.status === 'active' ? '#00ff88' : '#ff3b3b',
              boxShadow: `0 0 6px ${camera?.status === 'active' ? '#00ff88' : '#ff3b3b'}`,
            }} />
            <span style={{ fontSize: 9, color: camera?.status === 'active' ? '#00ff88' : '#ff3b3b', letterSpacing: 1 }}>
              {camera?.status?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <MapPin size={12} style={{ color: '#4a6070' }} />
            <span style={{ fontSize: 11, color: '#7090a0' }}>{camera?.location || alert.location || '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(camera?.enabled_usecases || []).map(ucId => {
              const uc = UC_MAP[ucId]
              return (
                <span key={ucId} style={{
                  fontSize: 9, padding: '3px 8px', letterSpacing: 1,
                  background: `${uc?.color || '#4a6070'}15`,
                  border: `1px solid ${uc?.color || '#4a6070'}33`,
                  color: uc?.color || '#4a6070',
                }}>
                  {uc?.emoji} {uc?.label || ucId}
                </span>
              )
            })}
          </div>
        </div>

        {/* ─── Analytics Loading / Data ─── */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 11, color: '#2a4050', letterSpacing: 3 }}>
            LOADING ANALYTICS…
          </div>
        ) : data ? (
          <>
            {/* ─── Capacity Alert Banner ─── */}
            {data.capacityStatus !== 'ok' && (
              <div className="capacity-alert-banner" style={{
                background: `${CAP_COLOR[data.capacityStatus]}0a`,
                border: `1px solid ${CAP_COLOR[data.capacityStatus]}44`,
                padding: '12px 16px', marginTop: 16,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <AlertTriangle size={18} style={{ color: CAP_COLOR[data.capacityStatus], flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, color: CAP_COLOR[data.capacityStatus], fontWeight: 'bold', letterSpacing: 1 }}>
                    ⚠️ SPACE {CAP_LABEL[data.capacityStatus]}
                  </div>
                  <div style={{ fontSize: 10, color: '#7090a0', marginTop: 3 }}>
                    {data.currentInFrame} people detected — capacity limit is {data.capacityLimit}
                  </div>
                </div>
              </div>
            )}

            {/* ─── KPI Grid ─── */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10, marginTop: 16,
            }}>
              {/* Current In Frame */}
              <div style={{ background: '#060d18', border: '1px solid #0d2030', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Users size={12} style={{ color: '#00cfff' }} />
                  <span style={{ fontSize: 9, color: '#2a4050', letterSpacing: 2 }}>IN FRAME NOW</span>
                </div>
                <div className="live-dot" style={{
                  fontSize: 28, fontWeight: 'bold',
                  color: CAP_COLOR[data.capacityStatus], lineHeight: 1,
                }}>{data.currentInFrame}</div>
                <div style={{ fontSize: 9, color: '#2a4050', marginTop: 6 }}>
                  limit: {data.capacityLimit}
                </div>
              </div>

              {/* Total Today */}
              <div style={{ background: '#060d18', border: '1px solid #0d2030', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <TrendingUp size={12} style={{ color: '#00ff88' }} />
                  <span style={{ fontSize: 9, color: '#2a4050', letterSpacing: 2 }}>TOTAL TODAY</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00ff88', lineHeight: 1 }}>
                  {data.totalToday}
                </div>
                <div style={{ fontSize: 9, color: '#2a4050', marginTop: 6 }}>
                  people passed today
                </div>
              </div>

              {/* Peak Hour */}
              <div style={{ background: '#060d18', border: '1px solid #0d2030', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Clock size={12} style={{ color: '#ffd600' }} />
                  <span style={{ fontSize: 9, color: '#2a4050', letterSpacing: 2 }}>PEAK HOUR</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ffd600', lineHeight: 1 }}>
                  {data.peakHour}
                </div>
                <div style={{ fontSize: 9, color: '#2a4050', marginTop: 6 }}>
                  {data.peakCount} people
                </div>
              </div>

              {/* Avg Per Hour */}
              <div style={{ background: '#060d18', border: '1px solid #0d2030', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Activity size={12} style={{ color: '#00cfff' }} />
                  <span style={{ fontSize: 9, color: '#2a4050', letterSpacing: 2 }}>AVG / HOUR</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#00cfff', lineHeight: 1 }}>
                  {data.avgPerHour}
                </div>
                <div style={{ fontSize: 9, color: '#2a4050', marginTop: 6 }}>
                  avg per hour
                </div>
              </div>
            </div>

            {/* ─── Hourly Timeline Bar Chart ─── */}
            <div style={{
              background: '#060d18', border: '1px solid #0d2030',
              padding: 16, marginTop: 16,
            }}>
              <div style={{ fontSize: 9, color: '#2a4050', letterSpacing: 2, marginBottom: 14 }}>
                HOURLY FOOTFALL — TODAY
              </div>
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 2,
                height: 100, padding: '0 2px',
              }}>
                {data.hourlyTimeline.map((h, i) => {
                  const pct = (h.count / maxCount) * 100
                  const now = new Date().getHours()
                  const isCurrent = i === now
                  const barColor = isCurrent ? '#00cfff' : h.count > data.capacityLimit ? '#ff3b3b' : '#00ff8866'
                  return (
                    <div key={i} style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 3, position: 'relative',
                    }}
                      title={`${h.hour} — ${h.count} people`}
                    >
                      <div style={{
                        width: '100%', minWidth: 3,
                        height: `${Math.max(pct, 3)}%`,
                        background: barColor,
                        borderRadius: '1px 1px 0 0',
                        transition: 'height 0.3s ease',
                        boxShadow: isCurrent ? `0 0 6px ${barColor}` : 'none',
                      }} />
                    </div>
                  )
                })}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 6, fontSize: 8, color: '#1e3040',
              }}>
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
              <div style={{
                display: 'flex', gap: 14, marginTop: 10,
                fontSize: 8, color: '#2a4050',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: '#00ff8866', display: 'inline-block' }} /> Normal
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: '#ff3b3b', display: 'inline-block' }} /> Over Capacity
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: '#00cfff', display: 'inline-block' }} /> Current Hour
                </span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: 30, textAlign: 'center', fontSize: 11, color: '#1e3040', letterSpacing: 2 }}>
            ANALYTICS UNAVAILABLE
          </div>
        )}
      </div>
    </div>
  )
}
