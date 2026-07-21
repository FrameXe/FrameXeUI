/**
 * TenantManagement.jsx
 * ═══════════════════════════════════════════════════════════════════════════
 * Tenant Registration & Install Token Management
 *
 * Features:
 *  - Create a new tenant with ID + label + optional expiry
 *  - Generate cryptographic install token (shown ONCE)
 *  - Copy token + tenant ID to clipboard
 *  - List all active tokens across tenants
 *  - Revoke tokens instantly
 *  - Edge Agent installer instructions inline
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Key, Copy, CheckCircle2, Trash2, RefreshCw,
  Shield, AlertTriangle, Info, Eye, EyeOff, X,
  Building2, Clock, Activity, ChevronRight, Zap,
  Terminal, ExternalLink, Check, Loader2
} from 'lucide-react'
import { tokenAPI } from '../services/api.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const TENANT_ID_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const TENANT_ID_HINT  = 'Lowercase letters, numbers, and hyphens only (e.g. arjangarh-rajeev)'

// ── Small helpers ─────────────────────────────────────────────────────────────

function useCopyToClipboard(timeoutMs = 2000) {
  const [copied, setCopied] = useState(null)
  const copy = useCallback(async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), timeoutMs)
    } catch {
      /* fallback */
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(key)
      setTimeout(() => setCopied(null), timeoutMs)
    }
  }, [timeoutMs])
  return { copied, copy }
}

function timeAgo(iso) {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatDate(iso) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// ── Token Reveal Box ──────────────────────────────────────────────────────────
function TokenRevealBox({ token, tenantId, onClose }) {
  const [revealed, setRevealed] = useState(false)
  const { copied, copy } = useCopyToClipboard()

  const backendUrl = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:9002`
  const setupInfoString = `Master Backend URL: ${backendUrl}\nTenant ID: ${tenantId}\nInstall Token: ${token}`

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.65)',
      backdropFilter: 'blur(6px)',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)',
        width: '100%', maxWidth: 560,
        overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
          padding: '28px 28px 24px',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Key size={18} color="#fff" />
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Install Token Generated</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                Tenant: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{tenantId}</strong>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', transition: 'background 0.15s',
            }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
               onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
              <X size={16} />
            </button>
          </div>

          {/* Warning banner */}
          <div style={{
            marginTop: 16,
            background: 'rgba(251,191,36,0.2)',
            border: '1px solid rgba(251,191,36,0.4)',
            borderRadius: 10, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <AlertTriangle size={15} color="#fbbf24" />
            <span style={{ fontSize: 12, color: '#fef3c7', fontWeight: 600 }}>
              This token is shown ONCE. Copy and save it now.
            </span>
          </div>
        </div>

        {/* Token section */}
        <div style={{ padding: '24px 28px', maxHeight: '70vh', overflowY: 'auto' }}>

          {/* Master Backend URL field */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Master Backend URL
            </label>
            <div style={{
              background: '#f8faff',
              border: '1.5px solid #c7d7fc',
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <code style={{ fontFamily: 'monospace', fontSize: 13, color: '#1e40af', flex: 1, wordBreak: 'break-all' }}>
                {backendUrl}
              </code>
              <button onClick={() => copy(backendUrl, 'url')} style={{
                background: copied === 'url' ? '#f0fdf4' : 'var(--accent-bg)',
                border: `1px solid ${copied === 'url' ? '#86efac' : '#c7d7fc'}`,
                borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                color: copied === 'url' ? 'var(--green)' : 'var(--accent)',
                fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                flexShrink: 0, transition: 'all 0.15s',
              }}>
                {copied === 'url' ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
          </div>

          {/* Tenant ID field */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Tenant ID
            </label>
            <div style={{
              background: '#f8faff',
              border: '1.5px solid #c7d7fc',
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <code style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#1e40af' }}>
                {tenantId}
              </code>
              <button onClick={() => copy(tenantId, 'tid')} style={{
                background: copied === 'tid' ? '#f0fdf4' : 'var(--accent-bg)',
                border: `1px solid ${copied === 'tid' ? '#86efac' : '#c7d7fc'}`,
                borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                color: copied === 'tid' ? 'var(--green)' : 'var(--accent)',
                fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                flexShrink: 0, transition: 'all 0.15s',
              }}>
                {copied === 'tid' ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
          </div>

          {/* Token field */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Install Token
            </label>
            <div style={{
              background: '#f8faff',
              border: '1.5px solid #c7d7fc',
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <code style={{
                flex: 1, fontFamily: 'monospace', fontSize: 13,
                color: revealed ? '#1e40af' : 'transparent',
                textShadow: revealed ? 'none' : '0 0 8px rgba(30,64,175,0.5)',
                filter: revealed ? 'none' : 'blur(5px)',
                userSelect: revealed ? 'auto' : 'none',
                wordBreak: 'break-all', lineHeight: 1.5,
                transition: 'all 0.3s',
              }}>
                {token}
              </code>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setRevealed(r => !r)} title={revealed ? 'Hide token' : 'Reveal token'} style={{
                  background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '6px 8px', cursor: 'pointer', color: 'var(--text-2)',
                  display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                }}>
                  {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => copy(token, 'token')} style={{
                  background: copied === 'token' ? '#f0fdf4' : 'var(--accent-bg)',
                  border: `1px solid ${copied === 'token' ? '#86efac' : '#c7d7fc'}`,
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                  color: copied === 'token' ? 'var(--green)' : 'var(--accent)',
                  fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}>
                  {copied === 'token' ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
            </div>
          </div>

          {/* Copy All Setup Info Button */}
          <div style={{ marginBottom: 24 }}>
            <button onClick={() => copy(setupInfoString, 'all')} style={{
              width: '100%',
              background: copied === 'all' ? '#dcfce7' : '#eff6ff',
              border: `1.5px dashed ${copied === 'all' ? '#22c55e' : '#3b82f6'}`,
              borderRadius: 12, padding: '14px', cursor: 'pointer',
              color: copied === 'all' ? '#15803d' : '#1d4ed8',
              fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}>
              {copied === 'all' ? <><CheckCircle2 size={16} /> Setup Info Copied to Clipboard!</> : <><Copy size={16} /> Copy All Setup Info (3 lines)</>}
            </button>
          </div>

          {/* Steps */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: 12, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1e40af', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={13} /> Next Steps
            </div>
            {[
              { n: '1', text: 'Copy Setup Info (Master Backend URL + Tenant ID + Install Token)' },
              { n: '2', text: 'Give this Setup Info to the on-site installer' },
              { n: '3', text: 'Installer runs the agent — it will auto-connect and configure' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 10, marginBottom: s.n === '3' ? 0 : 8, alignItems: 'flex-start' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#2563eb', color: '#fff',
                  fontSize: 10, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                }}>
                  {s.n}
                </div>
                <span style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>{s.text}</span>
              </div>
            ))}
          </div>

          {/* Close button */}
          <button onClick={onClose} style={{
            width: '100%', marginTop: 20,
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '13px', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', transition: 'opacity 0.15s',
          }} onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
             onMouseOut={e => e.currentTarget.style.opacity = '1'}>
            Done — I've saved the token
          </button>
        </div>
      </div>
    </div>
  )
}


// ── Create Tenant Modal ───────────────────────────────────────────────────────
function CreateTenantModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    tenant_id: '',
    label: '',
    expires_in_days: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.tenant_id) {
      e.tenant_id = 'Tenant ID is required'
    } else if (!TENANT_ID_REGEX.test(form.tenant_id)) {
      e.tenant_id = 'Only lowercase letters, numbers and hyphens ( - ) allowed. No underscores ( _ ).'
    }
    if (form.expires_in_days && (isNaN(form.expires_in_days) || +form.expires_in_days < 1)) {
      e.expires_in_days = 'Must be a positive number of days'
    }
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const result = await tokenAPI.generate({
        tenant_id: form.tenant_id,
        label: form.label || `Token-${form.tenant_id}`,
        expires_in_days: form.expires_in_days ? +form.expires_in_days : null,
      })
      onCreated(result)
    } catch (err) {
      setErrors({ global: err.message || 'Failed to generate token. Check backend connection.' })
    } finally {
      setLoading(false)
    }
  }

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  const tenantIdOk = form.tenant_id && TENANT_ID_REGEX.test(form.tenant_id)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.55)',
      backdropFilter: 'blur(6px)',
      zIndex: 1500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
        width: '100%', maxWidth: 480,
        overflow: 'hidden',
        animation: 'slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 0',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                border: '1px solid #bfdbfe',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Building2 size={18} color="#2563eb" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Register Tenant</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginLeft: 48 }}>
              Create a new tenant and generate an install token
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--surface-2)', border: 'none', borderRadius: 8,
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-2)',
          }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 28px 28px' }}>
          {errors.global && (
            <div style={{
              background: 'var(--red-bg)', border: '1px solid #fca5a5',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: 'var(--red)',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <AlertTriangle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
              {errors.global}
            </div>
          )}

          {/* Tenant ID */}
          <div style={{ marginBottom: 18 }}>
            <label style={{
              fontSize: 12, fontWeight: 700, color: 'var(--text-2)',
              display: 'block', marginBottom: 6,
            }}>
              Tenant ID <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="tenant-id-input"
                value={form.tenant_id}
                onChange={e => set('tenant_id', e.target.value.toLowerCase())}
                placeholder="e.g. arjangarh-rajeev"
                autoFocus
                style={{
                  width: '100%', padding: '11px 14px',
                  border: `1.5px solid ${errors.tenant_id ? 'var(--red)' : tenantIdOk ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius: 10, fontSize: 14, fontFamily: 'monospace',
                  fontWeight: 600, color: 'var(--text)',
                  outline: 'none', transition: 'border 0.15s',
                  background: tenantIdOk ? 'var(--green-bg)' : '#fff',
                }}
                onFocus={e => { if (!errors.tenant_id && !tenantIdOk) e.target.style.borderColor = 'var(--accent)' }}
                onBlur={e => { if (!tenantIdOk) e.target.style.borderColor = errors.tenant_id ? 'var(--red)' : 'var(--border)' }}
              />
              {tenantIdOk && (
                <CheckCircle2 size={16} color="var(--green)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
              )}
            </div>
            {errors.tenant_id ? (
              <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 5, display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                <AlertTriangle size={11} style={{ marginTop: 2, flexShrink: 0 }} />
                {errors.tenant_id}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, display: 'flex', gap: 4 }}>
                <Info size={11} style={{ marginTop: 2, flexShrink: 0 }} />
                {TENANT_ID_HINT}
              </div>
            )}

            {/* Not-allowed hint */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[
                { sym: '✗  _  underscore', bad: true },
                { sym: '✓  -  hyphen', bad: false },
              ].map(b => (
                <div key={b.sym} style={{
                  fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                  padding: '3px 10px', borderRadius: 20,
                  background: b.bad ? 'var(--red-bg)' : 'var(--green-bg)',
                  color: b.bad ? 'var(--red)' : 'var(--green)',
                  border: `1px solid ${b.bad ? '#fca5a5' : '#86efac'}`,
                }}>
                  {b.sym}
                </div>
              ))}
            </div>
          </div>

          {/* Label */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              Label <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="tenant-label-input"
              value={form.label}
              onChange={e => set('label', e.target.value)}
              placeholder="e.g. Site A - Floor 2"
              style={{
                width: '100%', padding: '11px 14px',
                border: '1.5px solid var(--border)',
                borderRadius: 10, fontSize: 14, color: 'var(--text)',
                outline: 'none', transition: 'border 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Expiry */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              Expires In (days) <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>(leave blank = never expires)</span>
            </label>
            <input
              id="tenant-expiry-input"
              type="number"
              min={1}
              max={3650}
              value={form.expires_in_days}
              onChange={e => set('expires_in_days', e.target.value)}
              placeholder="e.g. 365"
              style={{
                width: '100%', padding: '11px 14px',
                border: `1.5px solid ${errors.expires_in_days ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 10, fontSize: 14, color: 'var(--text)',
                outline: 'none', transition: 'border 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = errors.expires_in_days ? 'var(--red)' : 'var(--border)'}
            />
            {errors.expires_in_days && (
              <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 5 }}>{errors.expires_in_days}</div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 10, fontSize: 14, fontWeight: 600, color: 'var(--text-2)',
              cursor: 'pointer', transition: 'background 0.15s',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} id="generate-token-btn" style={{
              flex: 2, padding: '12px',
              background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s',
            }}>
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                : <><Key size={15} /> Generate Token</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Token Row ─────────────────────────────────────────────────────────────────
function TokenRow({ token, onRevoke, revoking, isExpanded, onToggleExpand }) {
  const isExpired = token.expires_at && new Date(token.expires_at) < new Date()
  const status = token.revoked ? 'revoked' : isExpired ? 'expired' : 'active'

  const statusStyle = {
    active:  { bg: 'var(--green-bg)',  color: 'var(--green)',  label: 'Active' },
    revoked: { bg: 'var(--red-bg)',    color: 'var(--red)',    label: 'Revoked' },
    expired: { bg: 'var(--yellow-bg)', color: 'var(--yellow)', label: 'Expired' },
  }[status]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 120px 90px 80px 80px',
      alignItems: 'center', gap: 12,
      padding: '14px 20px',
      transition: 'background 0.15s',
    }}
    onMouseOver={e => e.currentTarget.style.background = 'var(--surface-2)'}
    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>

      {/* Tenant + Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {status === 'active' ? (
          <button
            onClick={onToggleExpand}
            title={isExpanded ? "Collapse diagnostics" : "Expand diagnostics"}
            style={{
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              color: 'var(--text-3)', display: 'flex', alignItems: 'center',
              transform: isExpanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.2s ease',
              flexShrink: 0
            }}
          >
            <ChevronRight size={16} />
          </button>
        ) : (
          <div style={{ width: 24, flexShrink: 0 }} />
        )}
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {token.tenant_id}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {token.label || '—'}
          </div>
        </div>
      </div>

      {/* Token prefix */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Key size={12} color="var(--text-3)" />
        <code style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>
          {token.token_prefix}
        </code>
      </div>

      {/* Created */}
      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
        {timeAgo(token.created_at)}
      </div>

      {/* Expiry */}
      <div style={{ fontSize: 12, color: isExpired ? 'var(--red)' : 'var(--text-2)' }}>
        {formatDate(token.expires_at)}
      </div>

      {/* Used count & Last registration time */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: token.used_count > 0 ? 'var(--green)' : 'var(--text-3)', marginBottom: token.last_used_at ? 2 : 0 }}>
          {token.used_count}x
        </div>
        {token.last_used_at && (
          <div 
            style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap' }} 
            title={`Last used: ${new Date(token.last_used_at).toLocaleString()}`}
          >
            {timeAgo(token.last_used_at)}
          </div>
        )}
      </div>

      {/* Status + Revoke */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20,
          background: statusStyle.bg, color: statusStyle.color, letterSpacing: '0.05em',
        }}>
          {statusStyle.label}
        </span>
        {!token.revoked && !isExpired && (
          <button
            id={`revoke-btn-${token.token_prefix}`}
            onClick={() => onRevoke(token)}
            disabled={revoking}
            title="Revoke token"
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 6px',
              cursor: revoking ? 'not-allowed' : 'pointer',
              color: revoking ? 'var(--text-3)' : 'var(--red)',
              display: 'flex', alignItems: 'center',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => { if (!revoking) { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.borderColor = '#fca5a5' }}}
            onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            {revoking ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
          </button>
        )}
      </div>
    </div>
  )
}

function AgentDiagnosticsPanel({ tenantId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await tokenAPI.getDiagnostics(tenantId)
      setData(res)
    } catch (err) {
      setError(err.message || 'Failed to load diagnostics')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchDiagnostics()
  }, [fetchDiagnostics])

  if (loading) {
    return (
      <div style={{
        padding: '24px 32px',
        background: '#f8fafc',
        display: 'flex', alignItems: 'center', gap: 12,
        color: 'var(--text-3)', fontSize: 13,
      }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Fetching live agent telemetry and status logs…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '20px 32px',
        background: '#fff5f5',
        color: 'var(--red)',
        fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <AlertTriangle size={16} />
        <span>{error.includes('404') ? `No active agent connected for tenant '${tenantId}' yet.` : error}</span>
      </div>
    )
  }

  const agent = data?.agent || {}
  const logs = data?.logs || []
  const sys = agent.system_info

  // Status indicator properties
  const isOnline = agent.status === 'online'
  
  return (
    <div style={{
      padding: '24px 32px',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      borderTop: '1px solid var(--border-2)',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Pulsing Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isOnline ? '#dcfce7' : '#f1f5f9', border: `1px solid ${isOnline ? '#bbf7d0' : '#cbd5e1'}`, padding: '5px 12px', borderRadius: 20 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isOnline ? '#22c55e' : '#64748b',
              animation: isOnline ? 'pulseGlow 1.5s infinite' : 'none',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: isOnline ? '#15803d' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isOnline ? 'Agent Online' : 'Agent Offline'}
            </span>
          </div>

          {/* System metadata */}
          <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>Host: <strong>{agent.hostname || 'Unknown'}</strong></span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              OS: <strong>{agent.os_platform || 'Linux'}</strong>
            </span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span>Version: <strong>{agent.agent_version || '1.0.0'}</strong></span>
            {sys && sys.network_latency_ms !== undefined && (
              <>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Latency: 
                  <strong style={{ 
                    color: sys.network_latency_ms < 100 ? 'var(--green)' : sys.network_latency_ms < 250 ? 'var(--yellow)' : 'var(--red)'
                  }}>
                    {sys.network_latency_ms} ms
                  </strong>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 800,
                    background: sys.network_latency_ms < 100 ? 'var(--green-bg)' : sys.network_latency_ms < 250 ? 'var(--yellow-bg)' : 'var(--red-bg)',
                    color: sys.network_latency_ms < 100 ? 'var(--green)' : sys.network_latency_ms < 250 ? 'var(--yellow)' : 'var(--red)',
                    letterSpacing: '0.02em'
                  }}>
                    {sys.network_latency_ms < 100 ? 'Excellent' : sys.network_latency_ms < 250 ? 'Good' : 'Lagging'}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Cloudflare Tunnel URL */}
        {agent.hls_base_url && (
          <div style={{ fontSize: 12 }}>
            <span style={{ color: 'var(--text-3)' }}>Cloudflare Tunnel: </span>
            <a href={agent.hls_base_url} target="_blank" rel="noopener noreferrer" style={{
              color: '#2563eb', fontWeight: 700, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              borderBottom: '1px dotted #2563eb',
            }}>
              {agent.hls_base_url} <ExternalLink size={11} />
            </a>
          </div>
        )}
      </div>

      {/* Grid: Gauges & Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: sys ? '3fr 2fr' : '1fr', gap: 24 }}>
        
        {/* Telemetry Gauges */}
        {sys ? (
          <div style={{ background: '#fff', border: '1px solid var(--border-2)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-2)', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={14} color="var(--accent)" /> Real-Time Telemetry
            </h4>
            
            {/* CPU */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>
                <span>CPU Utilization</span>
                <span>{sys.cpu_percent}%</span>
              </div>
              <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${sys.cpu_percent}%`, height: '100%',
                  background: sys.cpu_percent > 85 ? '#ef4444' : sys.cpu_percent > 60 ? '#f59e0b' : '#3b82f6',
                  borderRadius: 4, transition: 'width 0.5s ease-out'
                }} />
              </div>
            </div>

            {/* RAM */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>
                <span>RAM Usage</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)' }}>
                  {sys.ram_used_gb} / {sys.ram_total_gb} GB ({sys.ram_percent}%)
                </span>
              </div>
              <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${sys.ram_percent}%`, height: '100%',
                  background: sys.ram_percent > 85 ? '#ef4444' : sys.ram_percent > 65 ? '#f59e0b' : '#10b981',
                  borderRadius: 4, transition: 'width 0.5s ease-out'
                }} />
              </div>
            </div>

            {/* Disk Space */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>
                <span>HLS Storage Space</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)' }}>
                  {sys.disk_used_gb} / {sys.disk_total_gb} GB ({sys.disk_percent}%)
                </span>
              </div>
              <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${sys.disk_percent}%`, height: '100%',
                  background: sys.disk_percent > 90 ? '#ef4444' : sys.disk_percent > 75 ? '#f59e0b' : '#6366f1',
                  borderRadius: 4, transition: 'width 0.5s ease-out'
                }} />
              </div>
            </div>

            {/* Active Streams */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', marginTop: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>Active Transcoding Streams</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#2563eb', background: '#dbeafe', padding: '3px 10px', borderRadius: 20 }}>
                {sys.active_streams} Stream{sys.active_streams !== 1 ? 's' : ''}
              </span>
            </div>

            {/* GPU Details */}
            {sys.gpu_info && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>Hardware GPU</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: '#d1fae5', padding: '3px 10px', borderRadius: 20, maxWidth: '60%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={sys.gpu_info}>
                  {sys.gpu_info}
                </span>
              </div>
            )}

            {/* Camera Transcoding Health & Metrics */}
            {sys.streams_status && sys.streams_status.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid var(--border-2)', paddingTop: 12, marginBottom: 4 }}>
                  Camera Stream Health
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sys.streams_status.map((stream) => {
                    const isLowFps = stream.fps > 0 && stream.fps < 12;
                    return (
                      <div key={stream.camera_id} style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 65px 95px 65px 75px',
                        alignItems: 'center',
                        gap: 8,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '10px 14px'
                      }}>
                        {/* Camera Name */}
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stream.name}>
                            {stream.name}
                          </span>
                          <code style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                            {stream.camera_id}
                          </code>
                        </div>

                        {/* FPS */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 600 }}>FPS</span>
                          <span style={{ 
                            fontSize: 12, fontWeight: 800, 
                            color: isLowFps ? '#d97706' : '#059669' 
                          }}>
                            {stream.fps.toFixed(1)}
                          </span>
                        </div>

                        {/* Bitrate */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 600 }}>Bitrate</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                            {stream.bitrate}
                          </span>
                        </div>

                        {/* Speed */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 600 }}>Speed</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>
                            {stream.speed}
                          </span>
                        </div>

                        {/* Status */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <span style={{
                            fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                            background: stream.status === 'active' ? 'var(--green-bg)' : 'var(--border-2)',
                            color: stream.status === 'active' ? 'var(--green)' : 'var(--text-3)',
                            textTransform: 'uppercase', letterSpacing: '0.03em'
                          }}>
                            {stream.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--border-2)', borderRadius: 14, padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
            Waiting for agent heartbeat payload to receive live hardware diagnostics telemetry...
          </div>
        )}

        {/* Liveness Event Logs */}
        <div style={{ background: '#fff', border: '1px solid var(--border-2)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-2)', paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color="var(--accent)" /> Uptime & Connection History
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
            {logs.length > 0 ? (
              logs.map((log, index) => {
                const isLogOnline = log.status === 'online'
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11 }}>
                    {/* Event bullet */}
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: isLogOnline ? '#dcfce7' : '#fee2e2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 2,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLogOnline ? '#22c55e' : '#ef4444' }} />
                    </div>

                    {/* Log text */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>
                        Status changed to {isLogOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                      <span style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 1 }}>
                        Reason: {log.reason === 'heartbeat_received' ? 'Heartbeat Connected' : log.reason === 'heartbeat_timeout' ? 'Connection Timeout' : log.reason} · {new Date(log.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ color: 'var(--text-3)', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>
                No connection logs recorded for this tenant yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Pulse glow animation styles */}
      <style>{`
        @keyframes pulseGlow {
          0%   { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          70%  { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 0 6px rgba(34,197,94,0); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>
    </div>
  )
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TenantManagement() {
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newToken, setNewToken] = useState(null)   // {token, tenant_id} — shown in reveal modal
  const [revoking, setRevoking] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filterTenant, setFilterTenant] = useState('')
  const [includeRevoked, setIncludeRevoked] = useState(false)
  const [expandedToken, setExpandedToken] = useState(null)

  // Derived stats
  const activeCount  = tokens.filter(t => !t.revoked && !(t.expires_at && new Date(t.expires_at) < new Date())).length
  const revokedCount = tokens.filter(t => t.revoked).length
  const tenants      = [...new Set(tokens.map(t => t.tenant_id))]

  const loadTokens = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      // Backend now has /install-tokens/all which returns all tokens across all tenants
      // No session cache needed — MongoDB does the heavy lifting
      const data = await tokenAPI.listAll(includeRevoked)
      setTokens(data.tokens || [])
    } catch (err) {
      setError(err.message || 'Failed to load tokens')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [includeRevoked])

  useEffect(() => { loadTokens() }, [loadTokens])

  const handleCreated = (result) => {
    setShowCreate(false)
    setNewToken({ token: result.token, tenantId: result.tenant_id })
    loadTokens(true)
  }

  const handleRevoke = async (tok) => {
    if (!window.confirm(`Revoke token "${tok.token_prefix}" for tenant "${tok.tenant_id}"?\nThis cannot be undone.`)) return
    setRevoking(tok.token_prefix)
    try {
      await tokenAPI.revoke(tok.token_prefix, tok.tenant_id)
      await loadTokens(true)
    } catch (err) {
      alert('Failed to revoke token: ' + err.message)
    } finally {
      setRevoking(null)
    }
  }

  const filtered = tokens.filter(t => {
    if (filterTenant && t.tenant_id !== filterTenant) return false
    return true
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Modals */}
      {showCreate && (
        <CreateTenantModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {newToken && (
        <TokenRevealBox
          token={newToken.token}
          tenantId={newToken.tenantId}
          onClose={() => setNewToken(null)}
        />
      )}

      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #bfdbfe',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Building2 size={22} color="#2563eb" />
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
                  Tenant Management
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
                  Register tenants · Generate install tokens · Manage agent access
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              id="refresh-tokens-btn"
              onClick={() => loadTokens(true)}
              disabled={refreshing}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--surface)', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
                transition: 'all 0.15s',
              }}>
              <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button
              id="add-tenant-btn"
              onClick={() => setShowCreate(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 10,
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
                transition: 'opacity 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={e => e.currentTarget.style.opacity = '1'}>
              <Plus size={15} /> Add Tenant
            </button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          {
            label: 'Active Tokens', value: activeCount,
            icon: <Activity size={18} color="#2563eb" />,
            bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '#bfdbfe', color: '#1e40af',
          },
          {
            label: 'Total Tenants', value: tenants.length,
            icon: <Building2 size={18} color="#7c3aed" />,
            bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            border: '#c4b5fd', color: '#6d28d9',
          },
          {
            label: 'Revoked Tokens', value: revokedCount,
            icon: <Shield size={18} color="#dc2626" />,
            bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '#fca5a5', color: '#dc2626',
          },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 14, padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: '#fff', border: `1px solid ${s.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize: 12, color: s.color, opacity: 0.75, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works banner */}
      <div style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%)',
        border: '1px solid #bfdbfe',
        borderRadius: 14, padding: '16px 20px',
        marginBottom: 24,
        display: 'flex', alignItems: 'flex-start', gap: 14,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Terminal size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1e40af', marginBottom: 6 }}>How Agent Installation Works</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12, color: '#3b82f6' }}>
            {[
              '1. Add Tenant here',
              '→',
              '2. Copy Setup Info (Backend URL, Tenant ID, Token)',
              '→',
              '3. Give details to installer',
              '→',
              '4. Agent auto-connects via Cloudflare Tunnel ✓',
            ].map((s, i) => (
              <span key={i} style={{ fontWeight: s === '→' ? 400 : 600 }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Table container */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: 'var(--shadow)',
      }}>
        {/* Table toolbar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} color="var(--accent)" />
            Install Tokens
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
              background: 'var(--accent-bg)', color: 'var(--accent)',
            }}>
              {filtered.length}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Tenant filter */}
            <select
              id="filter-tenant-select"
              value={filterTenant}
              onChange={e => setFilterTenant(e.target.value)}
              style={{
                padding: '7px 12px', borderRadius: 8,
                border: '1px solid var(--border)', fontSize: 12,
                color: 'var(--text-2)', background: 'var(--surface)',
                cursor: 'pointer', outline: 'none',
              }}>
              <option value="">All Tenants</option>
              {tenants.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* Include revoked toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>
              <input
                id="include-revoked-toggle"
                type="checkbox"
                checked={includeRevoked}
                onChange={e => setIncludeRevoked(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Show Revoked
            </label>
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 120px 90px 80px 80px',
          padding: '10px 20px',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          gap: 12,
        }}>
          {['Tenant / Label', 'Token Prefix', 'Created', 'Expires', 'Used', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: i === 5 ? 'right' : 'left' }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 13 }}>Loading tokens…</div>
          </div>
        ) : error ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{
              background: 'var(--red-bg)', border: '1px solid #fca5a5',
              borderRadius: 12, padding: '16px 20px', display: 'inline-flex',
              alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--red)',
            }}>
              <AlertTriangle size={16} /> {error}
              <button onClick={() => loadTokens()} style={{
                background: 'none', border: '1px solid #fca5a5', borderRadius: 6,
                padding: '4px 10px', cursor: 'pointer', color: 'var(--red)', fontSize: 11, fontWeight: 700,
              }}>Retry</button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #f0f9ff, #eff6ff)',
              border: '1px solid #bfdbfe',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Building2 size={24} color="#93c5fd" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>
              No tenants yet
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
              Click "Add Tenant" to register your first tenant and generate an install token.
            </div>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10,
                background: 'linear-gradient(135deg, #1e40af, #2563eb)',
                border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
              <Plus size={14} /> Add First Tenant
            </button>
          </div>
        ) : (
          filtered.map(tok => {
            const isExpanded = expandedToken === tok.token_prefix
            return (
              <div key={`${tok.tenant_id}-${tok.token_prefix}`} style={{ borderBottom: '1px solid var(--border-2)' }}>
                <TokenRow
                  token={tok}
                  onRevoke={handleRevoke}
                  revoking={revoking === tok.token_prefix}
                  isExpanded={isExpanded}
                  onToggleExpand={() => setExpandedToken(isExpanded ? null : tok.token_prefix)}
                />
                {isExpanded && (
                  <AgentDiagnosticsPanel tenantId={tok.tenant_id} />
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Extra keyframes for this page */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
