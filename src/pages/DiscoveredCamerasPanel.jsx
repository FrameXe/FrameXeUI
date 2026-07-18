/**
 * DiscoveredCamerasPanel.jsx
 * ═══════════════════════════════════════════════════════════════════════════
 * Ops page for managing camera discovery and assignment.
 *
 * Features:
 *  - Tenant selector dropdown
 *  - Agent online/offline status banner (live via SSE)
 *  - Unassigned cameras table with:
 *    • Per-row checkbox for multi-select
 *    • Header "Select All" master checkbox
 *    • Per-row "Assign" single-camera button
 *    • Floating action bar when ≥1 row selected
 *  - Assign modal (single, group, or all-unassigned modes):
 *    • Zone label, credentials, RTSP path/port
 *    • Use-case checkboxes
 *    • "Apply credentials / use-cases to ALL" toggles
 *    • Dynamic confirm button label with camera count
 *    • Progress toast for bulk operations
 *  - Assigned cameras table with live stream status dots (SSE)
 *    • Unassign button per row
 *  - Auto-refresh of discovered list on new camera_discovered SSE event
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Wifi, WifiOff, Camera, CheckCircle, XCircle, RefreshCw,
  ChevronDown, X, AlertCircle, Loader, Trash2, Radio,
  MapPin, User, Lock, Link2, Layers, Check, Info
} from 'lucide-react'
import { agentAPI } from '../services/api.js'
import { useSSE } from '../hooks/useSSE.js'

// ── Constants ────────────────────────────────────────────────────────────────

const AVAILABLE_USE_CASES = [
  { id: 'vehicle_count',  label: 'Vehicle Count',        emoji: '🚗' },
  { id: 'people_count',   label: 'People Count',         emoji: '🧑' },
  { id: 'crowd_alert',    label: 'Crowd Alert',          emoji: '🫂' },
  { id: 'intrusion',      label: 'Intrusion Detection',  emoji: '🚧' },
  { id: 'license_plate',  label: 'License Plate (LPR)',  emoji: '🔢' },
  { id: 'wrong_way',      label: 'Wrong Way',            emoji: '⛔' },
]

const DEMO_TENANTS = [
  { id: 'acme_corp',       label: 'Acme Corp' },
  { id: 'tenant_demo',     label: 'Demo Tenant' },
  { id: 'arjangarh_01',    label: 'Arjangarh Site 01' },
]

const DEFAULT_FORM = {
  zone:       '',
  username:   'admin',
  password:   '',
  rtsp_path:  '/cam/realmonitor?channel=1&subtype=0',
  rtsp_port:  554,
  use_cases:  ['vehicle_count', 'people_count'],
  apply_creds_to_all: false,
  apply_uc_to_all:    false,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const color = status === 'up' ? '#16a34a' : status === 'down' ? '#dc2626' : '#94a3b8'
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10,
      borderRadius: '50%', background: color, flexShrink: 0,
      boxShadow: status === 'up' ? `0 0 0 3px ${color}22` : 'none',
    }} />
  )
}

function Badge({ children, color = '#2563eb', bg = '#eff6ff' }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
      background: bg, color, letterSpacing: '0.04em',
    }}>{children}</span>
  )
}

function Toast({ toast }) {
  if (!toast) return null
  const isError   = toast.type === 'error'
  const isSuccess = toast.type === 'success'
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: isError ? '#dc2626' : isSuccess ? '#16a34a' : '#1e293b',
      color: '#fff', borderRadius: 10, padding: '12px 20px',
      fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)', maxWidth: 380,
      animation: 'slideUp 0.2s ease',
    }}>
      {toast.type === 'loading' && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
      {isSuccess && <CheckCircle size={14} />}
      {isError   && <XCircle size={14} />}
      {toast.msg}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function AssignModal({ cameras, tenantId, onClose, onSuccess }) {
  const isMulti    = cameras.length > 1
  const firstCam   = cameras[0] || {}
  const [form, setForm] = useState({
    ...DEFAULT_FORM,
    manufacturer: firstCam.manufacturer || '',
    model:        firstCam.model || '',
  })
  const [submitting, setSubmitting]     = useState(false)
  const [progress, setProgress]         = useState(null) // {done, total}

  const unassignedCount = cameras.length

  function toggleUseCase(id) {
    setForm(f => ({
      ...f,
      use_cases: f.use_cases.includes(id)
        ? f.use_cases.filter(u => u !== id)
        : [...f.use_cases, id],
    }))
  }

  function btnLabel() {
    if (submitting) return progress
      ? `Assigning ${progress.done} of ${progress.total}...`
      : 'Assigning...'
    if (!isMulti) return '✓ Assign this camera'
    return `✓ Assign ${cameras.length} cameras`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setProgress({ done: 0, total: cameras.length })

    // Build assignment payloads for each camera
    const payloads = cameras.map(cam => ({
      tenant_id:    tenantId,
      ip:           cam.ip,
      mac:          cam.mac || null,
      zone:         form.zone || `Zone - ${cam.ip}`,
      username:     form.apply_creds_to_all || !isMulti ? form.username : cam.username || form.username,
      password:     form.apply_creds_to_all || !isMulti ? form.password : cam.password || form.password,
      rtsp_path:    form.rtsp_path,
      rtsp_port:    Number(form.rtsp_port),
      use_cases:    form.apply_uc_to_all || !isMulti ? form.use_cases : cam.use_cases || form.use_cases,
      manufacturer: cam.manufacturer || null,
      model:        cam.model || null,
    }))

    let done = 0
    const succeeded = [], failed = []
    for (const payload of payloads) {
      try {
        await agentAPI.assignCamera(payload)
        succeeded.push(payload)
      } catch (err) {
        failed.push({ cam: payload, err: err.message })
      }
      done++
      setProgress({ done, total: payloads.length })
    }

    setSubmitting(false)
    onSuccess({ succeeded, failed })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: 16, width: 520, maxWidth: '94vw',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid #e4e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {isMulti ? `Assign ${cameras.length} cameras` : `Assign ${firstCam.ip}`}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
              {isMulti
                ? `Cameras: ${cameras.slice(0, 3).map(c => c.ip).join(', ')}${cameras.length > 3 ? ` +${cameras.length - 3} more` : ''}`
                : `${firstCam.manufacturer || 'Camera'} · ${firstCam.discovery_method || 'ONVIF'}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
          {/* Zone */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Zone / Location</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
              <input
                placeholder="e.g. Block A – Gate 1"
                value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
          </div>

          {/* Credentials */}
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>Credentials</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <User size={13} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                <input placeholder="Username" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  style={{ ...inputStyle, paddingLeft: 30 }} />
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={13} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                <input placeholder="Password" type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ ...inputStyle, paddingLeft: 30 }} />
              </div>
            </div>
          </div>
          {isMulti && (
            <ToggleRow
              checked={form.apply_creds_to_all}
              onChange={v => setForm(f => ({ ...f, apply_creds_to_all: v }))}
              label="Apply these credentials to ALL selected cameras"
            />
          )}

          {/* RTSP */}
          <div style={{ marginBottom: 16, marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={labelStyle}>RTSP Settings</label>
              <span style={{ fontSize: 9, color: '#3b82f6', fontWeight: 700, letterSpacing: '0.05em' }}>✨ AUTO-DETECT ACTIVE</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <Link2 size={13} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                <input placeholder="/cam/realmonitor?channel=1&subtype=0"
                  value={form.rtsp_path}
                  onChange={e => setForm(f => ({ ...f, rtsp_path: e.target.value }))}
                  style={{ ...inputStyle, paddingLeft: 30, fontSize: 11 }} />
              </div>
              <input placeholder="Port" type="number" value={form.rtsp_port}
                onChange={e => setForm(f => ({ ...f, rtsp_port: e.target.value }))}
                style={inputStyle} />
            </div>
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 4, fontStyle: 'italic', lineHeight: 1.2 }}>
              * If you don't know the RTSP path or port, leave them as is. The system will automatically probe and detect them after you click Assign.
            </div>
          </div>


          {/* Use cases */}
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}><Layers size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Use Cases</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {AVAILABLE_USE_CASES.map(uc => (
                <button key={uc.id} type="button"
                  onClick={() => toggleUseCase(uc.id)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: '1.5px solid', cursor: 'pointer',
                    background: form.use_cases.includes(uc.id) ? '#2563eb' : '#f8f9fd',
                    borderColor: form.use_cases.includes(uc.id) ? '#2563eb' : '#e4e8f0',
                    color: form.use_cases.includes(uc.id) ? '#fff' : '#475569',
                    transition: 'all 0.15s',
                  }}>{uc.emoji} {uc.label}</button>
              ))}
            </div>
          </div>
          {isMulti && (
            <ToggleRow
              checked={form.apply_uc_to_all}
              onChange={v => setForm(f => ({ ...f, apply_uc_to_all: v }))}
              label="Apply these use cases to ALL selected cameras"
            />
          )}

          {/* Summary */}
          {isMulti && (
            <div style={{
              marginTop: 16, padding: '10px 14px', background: '#f0fdf4',
              borderRadius: 8, fontSize: 12, color: '#166534', display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <Info size={13} />
              {form.apply_creds_to_all && form.apply_uc_to_all
                ? `All ${cameras.length} cameras will use the same credentials and use cases.`
                : form.apply_creds_to_all
                  ? `Shared credentials + individual use cases for ${cameras.length} cameras.`
                  : form.apply_uc_to_all
                    ? `Individual credentials + shared use cases for ${cameras.length} cameras.`
                    : `${cameras.length} cameras will be assigned with these settings.`}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1.5px solid #e4e8f0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || form.use_cases.length === 0}
              style={{
                flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
                background: submitting ? '#93c5fd' : '#2563eb',
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background 0.15s',
              }}>
              {submitting && <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />}
              {btnLabel()}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ToggleRow({ checked, onChange, label }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 11, color: '#475569', cursor: 'pointer', marginTop: 6, marginBottom: 2,
    }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width: 14, height: 14, accentColor: '#2563eb', cursor: 'pointer' }} />
      <span style={{ fontWeight: 600 }}>{label}</span>
    </label>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1.5px solid #e4e8f0',
  borderRadius: 8, fontSize: 13, outline: 'none', background: '#f8f9fd',
  color: '#0f172a', transition: 'border-color 0.15s',
}
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
}
const tableHeaderStyle = {
  padding: '10px 14px', fontSize: 10, fontWeight: 800, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap',
  background: '#f8f9fd', borderBottom: '1px solid #e4e8f0',
}
const tdStyle = {
  padding: '11px 14px', fontSize: 12, color: '#0f172a',
  borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle',
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DiscoveredCamerasPanel() {
  const [tenantId, setTenantId]           = useState(DEMO_TENANTS[0].id)
  const [discovered, setDiscovered]       = useState([])
  const [assigned, setAssigned]           = useState([])
  const [loading, setLoading]             = useState(false)
  const [agentOnline, setAgentOnline]     = useState(null)  // null=unknown, true, false
  const [agentLastSeen, setAgentLastSeen] = useState(null)
  const [selected, setSelected]           = useState(new Set())  // Set of discovered camera IPs
  const [modal, setModal]                 = useState(null)       // null | { cameras: [] }
  const [toast, setToast]                 = useState(null)
  const toastTimer = useRef(null)

  // ── SSE subscriptions ──────────────────────────────────────────────────────
  const { data: discoveryEvent } = useSSE(
    `/api/sse/agent/${tenantId}/cameras-discovered`, 'cameras_discovered'
  )
  const { data: agentStatusEvent } = useSSE(
    `/api/sse/agent/${tenantId}/agent-status`, 'agent_status_changed'
  )
  const { data: streamStatusEvent } = useSSE(
    `/api/sse/agent/${tenantId}/stream-status`, 'camera_stream_status'
  )

  // ── Data fetchers ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const [disc, asgn] = await Promise.all([
        agentAPI.getDiscoveredCameras(tenantId, true),
        agentAPI.getAssignedCameras(tenantId),
      ])
      setDiscovered(disc.cameras || [])
      setAssigned(asgn.cameras || [])
    } catch (err) {
      showToast('Failed to load cameras: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  // Initial load + on tenant change
  useEffect(() => { fetchAll() }, [fetchAll])

  // ── SSE reactivity ──────────────────────────────────────────────────────────
  // New camera discovered → refresh unassigned list
  useEffect(() => {
    if (discoveryEvent) fetchAll()
  }, [discoveryEvent])

  // Agent status changes
  useEffect(() => {
    if (!agentStatusEvent) return
    const isOnline = agentStatusEvent.status === 'online'
    setAgentOnline(isOnline)
    if (!isOnline) setAgentLastSeen(agentStatusEvent.last_seen || new Date().toISOString())
  }, [agentStatusEvent])

  // Stream status for assigned cameras (live dot update)
  useEffect(() => {
    if (!streamStatusEvent) return
    setAssigned(prev => prev.map(cam =>
      cam.camera_id === streamStatusEvent.camera_id
        ? { ...cam, stream_status: streamStatusEvent.status }
        : cam
    ))
  }, [streamStatusEvent])

  // ── Toast helper ──────────────────────────────────────────────────────────
  function showToast(msg, type = 'loading', duration = 3500) {
    clearTimeout(toastTimer.current)
    setToast({ msg, type })
    if (type !== 'loading') {
      toastTimer.current = setTimeout(() => setToast(null), duration)
    }
  }

  // ── Selection helpers ─────────────────────────────────────────────────────
  function toggleSelect(ip) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(ip) ? next.delete(ip) : next.add(ip)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === discovered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(discovered.map(c => c.ip)))
    }
  }

  const selectedCameras = discovered.filter(c => selected.has(c.ip))

  // ── Assign modal handlers ─────────────────────────────────────────────────
  function openSingleAssign(cam) {
    setModal({ cameras: [cam] })
  }
  function openGroupAssign() {
    setModal({ cameras: selectedCameras })
  }

  async function handleAssignSuccess({ succeeded, failed }) {
    setModal(null)
    setSelected(new Set())

    if (failed.length === 0) {
      showToast(`✓ ${succeeded.length} camera${succeeded.length > 1 ? 's' : ''} assigned successfully`, 'success')
    } else if (succeeded.length === 0) {
      showToast(`Failed to assign ${failed.length} camera(s)`, 'error')
    } else {
      showToast(`${succeeded.length} assigned, ${failed.length} failed`, 'success')
    }
    await fetchAll()
  }

  // ── Unassign ──────────────────────────────────────────────────────────────
  async function handleUnassign(cameraId) {
    showToast('Unassigning...', 'loading')
    try {
      await agentAPI.unassignCamera(cameraId)
      showToast('Camera unassigned', 'success')
      await fetchAll()
    } catch (err) {
      showToast('Unassign failed: ' + err.message, 'error')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto', background: '#f4f6fb' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .cam-row:hover { background: #f8f9fd !important; }
        .btn-outline:hover { background: #f1f5f9 !important; }
        .assign-btn:hover { background: #1d4ed8 !important; }
        .unassign-btn:hover { background: #fef2f2 !important; color: #dc2626 !important; }
      `}</style>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            📡 Agent Camera Manager
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Discover → assign cameras → Stream Manager hot-loads RTSP streams
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Tenant Selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={tenantId}
              onChange={e => { setTenantId(e.target.value); setSelected(new Set()) }}
              style={{
                padding: '8px 32px 8px 12px', borderRadius: 8, border: '1.5px solid #e4e8f0',
                background: '#fff', fontSize: 13, fontWeight: 600, color: '#0f172a',
                cursor: 'pointer', outline: 'none', appearance: 'none',
              }}>
              {DEMO_TENANTS.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
          </div>
          <button onClick={fetchAll} disabled={loading}
            className="btn-outline"
            style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e4e8f0', background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
      </div>

      {/* ─── Agent Status Banner ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
        borderRadius: 10, marginBottom: 24,
        background: agentOnline === true ? '#f0fdf4' : agentOnline === false ? '#fef2f2' : '#f8fafc',
        border: `1.5px solid ${agentOnline === true ? '#bbf7d0' : agentOnline === false ? '#fecaca' : '#e4e8f0'}`,
      }}>
        {agentOnline === true && <><Wifi size={16} color="#16a34a" /><span style={{ fontWeight: 700, color: '#16a34a', fontSize: 13 }}>Agent Online</span></>}
        {agentOnline === false && <><WifiOff size={16} color="#dc2626" /><span style={{ fontWeight: 700, color: '#dc2626', fontSize: 13 }}>Agent Offline</span>{agentLastSeen && <span style={{ fontSize: 11, color: '#94a3b8' }}>Last seen: {new Date(agentLastSeen).toLocaleString()}</span>}</>}
        {agentOnline === null && <><Radio size={16} color="#94a3b8" /><span style={{ fontWeight: 600, color: '#94a3b8', fontSize: 13 }}>Waiting for agent heartbeat...</span></>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>Tenant: <strong>{tenantId}</strong></span>
      </div>

      {/* ─── Discovered / Unassigned Cameras ────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e4e8f0', marginBottom: 24, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e4e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Camera size={16} color="#2563eb" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Unassigned Cameras</span>
            <Badge>{discovered.length}</Badge>
          </div>
          {selected.size > 0 && (
            <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
              {selected.size} selected
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <Loader size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            <div style={{ marginTop: 12, fontSize: 13 }}>Loading cameras...</div>
          </div>
        ) : discovered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <Camera size={32} style={{ margin: '0 auto', opacity: 0.3 }} />
            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600 }}>No unassigned cameras</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>All discovered cameras are assigned, or agent hasn't scanned yet.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...tableHeaderStyle, width: 44 }}>
                    <input type="checkbox"
                      checked={selected.size === discovered.length && discovered.length > 0}
                      onChange={toggleSelectAll}
                      style={{ width: 14, height: 14, accentColor: '#2563eb', cursor: 'pointer' }} />
                  </th>
                  <th style={tableHeaderStyle}>IP Address</th>
                  <th style={tableHeaderStyle}>Manufacturer</th>
                  <th style={tableHeaderStyle}>Model</th>
                  <th style={tableHeaderStyle}>Method</th>
                  <th style={tableHeaderStyle}>Verified</th>
                  <th style={tableHeaderStyle}>Auth</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {discovered.map(cam => (
                  <tr key={cam.ip} className="cam-row" style={{ background: selected.has(cam.ip) ? '#eff6ff' : '#fff' }}>
                    <td style={{ ...tdStyle, width: 44 }}>
                      <input type="checkbox"
                        checked={selected.has(cam.ip)}
                        onChange={() => toggleSelect(cam.ip)}
                        style={{ width: 14, height: 14, accentColor: '#2563eb', cursor: 'pointer' }} />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, fontFamily: 'monospace', color: '#2563eb' }}>
                      {cam.ip}
                    </td>
                    <td style={tdStyle}>{cam.manufacturer || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td style={tdStyle}>{cam.model || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td style={tdStyle}>
                      <Badge color="#7c3aed" bg="#f5f3ff">
                        {cam.discovery_method || 'ONVIF'}
                      </Badge>
                    </td>
                    <td style={tdStyle}>
                      {cam.verified
                        ? <CheckCircle size={15} color="#16a34a" />
                        : <AlertCircle size={15} color="#94a3b8" />}
                    </td>
                    <td style={tdStyle}>
                      {cam.auth_required
                        ? <Badge color="#d97706" bg="#fffbeb">Auth Required</Badge>
                        : <Badge color="#16a34a" bg="#f0fdf4">Open</Badge>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={() => openSingleAssign(cam)} className="assign-btn"
                        style={{
                          padding: '5px 14px', borderRadius: 7, border: 'none',
                          background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', transition: 'background 0.15s',
                        }}>
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Assigned Cameras ─────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e4e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e4e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Check size={16} color="#16a34a" />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Assigned Cameras</span>
          <Badge color="#16a34a" bg="#f0fdf4">{assigned.length}</Badge>
        </div>

        {assigned.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>No cameras assigned yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Assign cameras from the table above to start streaming.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>IP Address</th>
                  <th style={tableHeaderStyle}>Zone</th>
                  <th style={tableHeaderStyle}>Model</th>
                  <th style={tableHeaderStyle}>Use Cases</th>
                  <th style={tableHeaderStyle}>Assigned</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {assigned.map(cam => (
                  <tr key={cam.camera_id} className="cam-row">
                    <td style={{ ...tdStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusDot status={cam.stream_status || 'unknown'} />
                      <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                        {cam.stream_status === 'up' ? 'Streaming' : cam.stream_status === 'down' ? 'Down' : 'Unknown'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, fontFamily: 'monospace', color: '#2563eb' }}>
                      {cam.ip}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: '#0f172a' }}>{cam.zone || '—'}</span>
                    </td>
                    <td style={tdStyle}>{cam.model || cam.manufacturer || '—'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(cam.use_cases || []).map(uc => (
                          <Badge key={uc} color="#2563eb" bg="#eff6ff">{uc}</Badge>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 11, color: '#94a3b8' }}>
                      {cam.assigned_at ? new Date(cam.assigned_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={() => handleUnassign(cam.camera_id)} className="unassign-btn"
                        style={{
                          padding: '5px 12px', borderRadius: 7, border: '1.5px solid #e4e8f0',
                          background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                          transition: 'all 0.15s',
                        }}>
                        <Trash2 size={12} /> Unassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Floating Action Bar (multi-select) ─────────────────────────── */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#0f172a', color: '#fff', borderRadius: 14, padding: '14px 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 12px 32px rgba(0,0,0,0.25)', zIndex: 500,
          animation: 'slideUp 0.2s ease',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {selected.size} camera{selected.size > 1 ? 's' : ''} selected
          </span>
          <button onClick={() => setSelected(new Set())}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: 0 }}>
            Clear
          </button>
          <button onClick={openGroupAssign}
            style={{
              padding: '8px 20px', borderRadius: 9, border: 'none',
              background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <Camera size={14} /> Assign Selected ({selected.size})
          </button>
        </div>
      )}

      {/* ─── Assign Modal ────────────────────────────────────────────────── */}
      {modal && (
        <AssignModal
          cameras={modal.cameras}
          tenantId={tenantId}
          onClose={() => setModal(null)}
          onSuccess={handleAssignSuccess}
        />
      )}

      {/* ─── Toast ────────────────────────────────────────────────────────── */}
      <Toast toast={toast} />
    </div>
  )
}
