import { useState } from 'react'
import { useAuthStore } from '../store/index.js'
import { useCameras } from '../hooks/useCameras.js'
import { USE_CASES } from '../constants/useCases.js'
import { User, Key, Check, Shield, Camera, Edit2, Trash2, UserPlus, X, HelpCircle } from 'lucide-react'

// Available permission metadata for nice labeling
const FEATURES = [
  { id: 'view_dashboard', label: 'Dashboard', desc: 'Main operations analytics dashboard' },
  { id: 'view_cameras', label: 'Video Matrix', desc: 'View video feeds and single camera telemetry' },
  { id: 'view_events', label: 'Safety Alerts', desc: 'Safety Center real-time alert logs and resolution' },
  { id: 'view_reports', label: 'Reports', desc: 'Intelligence Logs and analytical Excel/CSV exports' },
  { id: 'manage_cameras', label: 'Configuration', desc: 'Modify camera use-cases, status, and detail settings' },
  { id: 'manage_users', label: 'User Directory', desc: 'Manage access keys, clearances, and camera whitelists' },
]

export default function UserManagement() {
  const { cameras } = useCameras()
  const users = useAuthStore(s => s.users)
  const currentUser = useAuthStore(s => s.user)
  const createUser = useAuthStore(s => s.createUser)
  const updateUser = useAuthStore(s => s.updateUser)
  const deleteUser = useAuthStore(s => s.deleteUser)

  const [isOpen, setIsOpen] = useState(false)
  const [editingUsername, setEditingUsername] = useState(null)
  
  // Form states
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [label, setLabel] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState(['view_dashboard', 'view_cameras'])
  const [selectedCameras, setSelectedCameras] = useState(['CAM-001'])
  const [selectedUsecases, setSelectedUsecases] = useState(['people_count'])
  const [formError, setFormError] = useState(null)

  const openAddModal = () => {
    setEditingUsername(null)
    setUsername('')
    setPassword('')
    setLabel('')
    setTenantId('')
    setSelectedPermissions(['view_dashboard', 'view_cameras'])
    setSelectedCameras(cameras.map(c => c.id)) // Default to all cameras for new users
    setSelectedUsecases(USE_CASES.map(u => u.id)) // Default to all usecases
    setFormError(null)
    setIsOpen(true)
  }

  const openEditModal = (user) => {
    setEditingUsername(user.username)
    setUsername(user.username)
    setPassword(user.password)
    setLabel(user.label || '')
    setTenantId(user.tenantId || '')
    setSelectedPermissions(user.permissions || [])
    setSelectedCameras(user.allowedCameras || [])
    setSelectedUsecases(user.allowedUsecases || [])
    setFormError(null)
    setIsOpen(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    setFormError(null)

    if (!username.trim() || !password.trim() || !label.trim()) {
      setFormError('All fields are required')
      return
    }

    const payload = {
      username: username.trim(),
      password: password.trim(),
      label: label.trim(),
      tenantId: tenantId.trim(),
      permissions: selectedPermissions,
      allowedCameras: selectedCameras,
      allowedUsecases: selectedUsecases,
    }

    try {
      if (editingUsername) {
        updateUser(editingUsername, payload)
      } else {
        createUser(payload)
      }
      setIsOpen(false)
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleDelete = (targetUsername) => {
    if (confirm(`Are you sure you want to delete user "${targetUsername}"?`)) {
      try {
        deleteUser(targetUsername)
      } catch (err) {
        alert(err.message)
      }
    }
  }

  const togglePermission = (id) => {
    setSelectedPermissions(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const toggleCamera = (id) => {
    setSelectedCameras(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const toggleUseCase = (id) => {
    setSelectedUsecases(prev =>
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            User Clearance Directory
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
            Manage personnel credentials, page access keys, and camera stream permissions.
          </p>
        </div>
        <button
          onClick={openAddModal}
          style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
          <UserPlus size={16} />
          <span>Add User Account</span>
        </button>
      </div>

      {/* Users Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {users.map(u => {
          const isCurrent = currentUser?.username === u.username
          return (
            <div
              key={u.username}
              style={{
                background: '#fff', border: '1px solid var(--border)', borderRadius: 16,
                padding: 24, boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column',
                gap: 16, transition: 'all 0.2s', position: 'relative'
              }}
            >
              {isCurrent && (
                <span style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'var(--accent-bg)', color: 'var(--accent)',
                  fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                  textTransform: 'uppercase', letterSpacing: '0.04em'
                }}>
                  You
                </span>
              )}

              {/* User Bio */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'var(--accent-bg)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 15
                  }}>
                    {u.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                      {u.label || u.username}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
                      @{u.username} {u.tenantId ? `· Tenant: ${u.tenantId}` : '· Super User'}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border-2)' }} />

              {/* Details & Clearances */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                    Feature Clearances ({u.permissions?.length || 0})
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {FEATURES.filter(f => u.permissions?.includes(f.id)).map(f => (
                      <span key={f.id} style={{
                        fontSize: 10, fontWeight: 600, background: '#f1f5f9', color: '#475569',
                        padding: '2px 8px', borderRadius: 6
                      }}>
                        {f.label}
                      </span>
                    ))}
                    {(!u.permissions || u.permissions.length === 0) && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>No pages cleared</span>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                    Permitted Feeds ({u.allowedCameras?.length || 0} / {cameras.length})
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {u.allowedCameras?.map(cid => (
                      <span key={cid} style={{
                        fontSize: 10, fontWeight: 700, background: 'var(--accent-bg)', color: 'var(--accent)',
                        padding: '2px 8px', borderRadius: 6
                      }}>
                        {cid}
                      </span>
                    ))}
                    {(!u.allowedCameras || u.allowedCameras.length === 0) && (
                      <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>No camera feeds cleared</span>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
                    Permitted Suites ({u.allowedUsecases?.length || 0} / {USE_CASES.length})
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {u.allowedUsecases?.map(ucid => {
                      const uc = USE_CASES.find(x => x.id === ucid)
                      return (
                        <span key={ucid} style={{
                          fontSize: 10, fontWeight: 700, background: `${uc?.color || '#3b82f6'}12`, color: uc?.color || '#3b82f6',
                          padding: '2px 8px', borderRadius: 6
                        }}>
                          {uc?.emoji} {uc?.label || ucid}
                        </span>
                      )
                    })}
                    {(!u.allowedUsecases || u.allowedUsecases.length === 0) && (
                      <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>No suites cleared</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border-2)', marginTop: 'auto' }} />

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => openEditModal(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 10, fontSize: 12, color: 'var(--text-2)', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Edit2 size={13} />
                  <span>Edit clearances</span>
                </button>

                <button
                  onClick={() => handleDelete(u.username)}
                  disabled={u.username === 'admin'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', background: 'transparent',
                    border: '1px solid rgba(220,38,38,0.15)',
                    borderRadius: 10, fontSize: 12, color: u.username === 'admin' ? 'var(--text-3)' : 'var(--red)',
                    fontWeight: 700, cursor: u.username === 'admin' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { if(u.username!=='admin') e.currentTarget.style.background = 'var(--red-bg)' }}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* SLIDE-OVER DRAWER MODAL */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
            justifyContent: 'flex-end'
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              width: 480, maxWidth: '100%', height: '100vh', background: '#fff',
              borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)', animation: 'slideInRight 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
                  {editingUsername ? 'Edit User Clearances' : 'Register New User'}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                  {editingUsername ? `Update configuration for @${editingUsername}` : 'Define access credentials and whitelists'}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'var(--surface-2)', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {formError && (
                <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.2)', padding: '10px 14px', borderRadius: 10, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
                  {formError}
                </div>
              )}

              {/* Login Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Login Credentials
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>Username</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}><User size={14} /></span>
                    <input
                      type="text"
                      disabled={!!editingUsername}
                      placeholder="e.g. sachin"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border)',
                        borderRadius: 10, fontSize: 13, outline: 'none', background: editingUsername ? 'var(--surface-2)' : '#fff',
                        fontWeight: 600
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}><Key size={14} /></span>
                    <input
                      type="text" // Plain text so admin knows what password they set
                      placeholder="Assign access password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border)',
                        borderRadius: 10, fontSize: 13, outline: 'none', fontWeight: 600
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>User Name/Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Sachin Dev (Zone B)"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                      borderRadius: 10, fontSize: 13, outline: 'none', fontWeight: 600
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>Tenant ID <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>(Leave blank for Super Admin)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. arjangarh-rajeev"
                    value={tenantId}
                    onChange={e => setTenantId(e.target.value.toLowerCase().trim())}
                    style={{
                      width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                      borderRadius: 10, fontSize: 13, outline: 'none', fontWeight: 600,
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border-2)' }} />

              {/* Clearances Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Feature Clearances (Page Access)
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {FEATURES.map(f => {
                    const checked = selectedPermissions.includes(f.id)
                    return (
                      <div
                        key={f.id}
                        onClick={() => togglePermission(f.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                          background: checked ? 'var(--accent-bg)' : 'transparent',
                          border: `1px solid ${checked ? 'rgba(37,99,235,0.15)' : 'var(--border)'}`,
                          borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                          background: checked ? 'var(--accent)' : '#fff', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#fff'
                        }}>
                          {checked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: checked ? 'var(--accent)' : 'var(--text)' }}>
                            {f.label}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                            {f.desc}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border-2)' }} />

              {/* Cameras Whitelist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Permitted Cameras
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cameras.map(c => {
                    const checked = selectedCameras.includes(c.id)
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCamera(c.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                          background: checked ? 'var(--accent-bg)' : 'transparent',
                          border: `1px solid ${checked ? 'rgba(37,99,235,0.15)' : 'var(--border)'}`,
                          borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                          background: checked ? 'var(--accent)' : '#fff', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#fff'
                        }}>
                          {checked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: checked ? 'var(--accent)' : 'var(--text)' }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                            ID: {c.id} · Location: {c.location}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border-2)' }} />

              {/* Use Cases Whitelist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Permitted Use Cases (Intelligence Suites)
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {USE_CASES.map(uc => {
                    const checked = selectedUsecases.includes(uc.id)
                    return (
                      <div
                        key={uc.id}
                        onClick={() => toggleUseCase(uc.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                          background: checked ? `${uc.color}10` : 'transparent',
                          border: `1px solid ${checked ? uc.color + '44' : 'var(--border)'}`,
                          borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, border: `1px solid ${checked ? uc.color : 'var(--border)'}`,
                          background: checked ? uc.color : '#fff', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#fff'
                        }}>
                          {checked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: checked ? uc.color : 'var(--text)' }}>
                            {uc.emoji} {uc.label}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                            {uc.desc}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </form>

            {/* Drawer Actions */}
            <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  padding: '10px 18px', background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 10, fontSize: 12, color: 'var(--text-2)', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '10px 22px', background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.2)'
                }}
              >
                {editingUsername ? 'Save changes' : 'Register user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
