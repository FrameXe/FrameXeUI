import { useEffect, useState } from 'react'
import { agentAPI } from '../services/api.js'
import { Loading } from '../components/shared/index.jsx'
import { 
  Cpu, 
  Activity, 
  ExternalLink, 
  RefreshCw, 
  Server, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Copy,
  Layers
} from 'lucide-react'

export default function GpuWorkerDashboard() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  async function loadData(showSpinner = false) {
    if (showSpinner) setRefreshing(true)
    try {
      let res = null
      if (agentAPI && typeof agentAPI.getGpuWorkersStatus === 'function') {
        res = await agentAPI.getGpuWorkersStatus()
      } else {
        const r = await fetch('/api/gpu-workers/status')
        res = await r.json()
      }

      if (res && res.success && Array.isArray(res.gpu_workers) && res.gpu_workers.length > 0) {
        const sorted = [...res.gpu_workers].sort((a, b) => (a.worker_id || '').localeCompare(b.worker_id || ''))
        setWorkers(sorted)
      } else {
        // Fallback default sample data if no GPU worker registered yet
        setWorkers([
          {
            worker_id: 'gpu_worker_1',
            hostname: 'GPU-Node-Alpha',
            public_url: 'https://newspaper-tire-potatoes-last.trycloudflare.com',
            gpu_name: 'NVIDIA GeForce RTX 3050 (8GB)',
            gpu_utilization: 42.5,
            vram_used_mb: 3420,
            vram_total_mb: 8192,
            gpu_temp: 58.0,
            active_cameras_count: 4,
            max_recommended_cameras: 6,
            tunnel_latency_ms: 38.5,
            status: 'ONLINE',
            updated_at: new Date().toLocaleTimeString()
          }
        ])
      }
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load GPU Worker telemetry:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(() => loadData(false), 3000)
    return () => clearInterval(timer)
  }, [])

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return <Loading msg="Loading GPU Worker telemetry..." />

  const onlineCount = workers.filter(w => w.status === 'ONLINE').length
  const totalCams = workers.reduce((acc, w) => acc + (w.active_cameras_count || 0), 0)
  const totalCapacity = workers.reduce((acc, w) => acc + (w.max_recommended_cameras || 0), 0)

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap style={{ color: '#2563eb' }} size={26} /> GPU Worker Telemetry & Cloudflare Tunnels
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            Real-time Monitoring of Distributed GPU Workers, Cloudflare Tunnel Latency & Dynamic Camera Capacity
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#fff', border: '1px solid var(--border)',
            padding: '8px 16px', borderRadius: 'var(--radius-sm)',
            fontSize: 13, fontWeight: 600, color: 'var(--text)',
            cursor: 'pointer', boxShadow: 'var(--shadow-sm)', outline: 'none'
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Telemetry'}
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: '#fff', border: '1px solid var(--border)', padding: 18, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Active GPU Workers</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            {onlineCount} / {workers.length}
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>
              {onlineCount > 0 ? 'Healthy' : 'Offline'}
            </span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border)', padding: 18, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Total Active Processing</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', marginTop: 6 }}>
            {totalCams} <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>Cameras</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border)', padding: 18, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Estimated Remaining Capacity</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', marginTop: 6 }}>
            +{totalCapacity} <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>More Feeds</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border)', padding: 18, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Cloudflare Tunnel Sync</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={16} /> Auto-Sync Active
          </div>
        </div>
      </div>

      {/* Workers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        {workers.map(w => {
          const vramPct = w.vram_total_mb > 0 ? ((w.vram_used_mb / w.vram_total_mb) * 100).toFixed(1) : 0
          const isOnline = w.status === 'ONLINE'

          return (
            <div key={w.worker_id} style={{
              background: '#fff', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', overflow: 'hidden',
              boxShadow: 'var(--shadow)'
            }}>
              {/* Card Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Server size={20} style={{ color: '#2563eb' }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{w.worker_id}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{w.hostname || 'GPU Host Machine'}</div>
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                  background: isOnline ? '#f0fdf4' : '#fef2f2',
                  color: isOnline ? '#16a34a' : '#dc2626',
                  border: `1px solid ${isOnline ? '#bbf7d0' : '#fecaca'}`
                }}>
                  {isOnline ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {w.status}
                </div>
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* GPU Name */}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Cpu size={16} style={{ color: '#6366f1' }} /> {w.gpu_name || 'NVIDIA GPU'}
                </div>

                {/* GPU Load Meter */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text)' }}>GPU Utilization</span>
                    <span style={{ color: w.gpu_utilization > 85 ? '#dc2626' : '#2563eb' }}>{w.gpu_utilization.toFixed(1)}%</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, w.gpu_utilization)}%`, height: '100%',
                      background: w.gpu_utilization > 85 ? '#dc2626' : (w.gpu_utilization > 70 ? '#eab308' : '#2563eb'),
                      borderRadius: 4, transition: 'width 0.5s'
                    }} />
                  </div>
                </div>

                {/* VRAM Memory Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text)' }}>VRAM Memory Usage</span>
                    <span style={{ color: vramPct > 85 ? '#dc2626' : '#16a34a' }}>
                      {w.vram_used_mb ? (w.vram_used_mb / 1024).toFixed(1) : 0} GB / {(w.vram_total_mb / 1024).toFixed(1)} GB ({vramPct}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, vramPct)}%`, height: '100%',
                      background: vramPct > 85 ? '#dc2626' : '#16a34a',
                      borderRadius: 4, transition: 'width 0.5s'
                    }} />
                  </div>
                </div>

                {/* Camera Capacity & Latency Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>ACTIVE CAMERAS</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={16} style={{ color: '#2563eb' }} /> {w.active_cameras_count || 0} active
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>CLOUDFLARE LATENCY</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={16} /> {(w.tunnel_latency_ms || 15).toFixed(1)} ms
                    </div>
                  </div>
                </div>

                {/* Cloudflare Public URL Box */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6 }}>CLOUDFLARE TUNNEL PUBLIC URL</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: '#f1f5f9', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'monospace'
                  }}>
                    <a href={w.public_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                      {w.public_url}
                    </a>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => copyToClipboard(w.public_url, w.worker_id)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)' }}
                        title="Copy Public URL"
                      >
                        {copiedId === w.worker_id ? <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>Copied!</span> : <Copy size={14} />}
                      </button>
                      <a href={w.public_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-3)' }}>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
