import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/index.js'
import { useCameras } from '../hooks/useCameras.js'
import { USE_CASES } from '../constants/useCases.js'
import { 
  User, Key, Check, Shield, Camera, Edit2, Trash2, UserPlus, X, 
  Search, SlidersHorizontal, ChevronDown, MoreVertical, Lock, 
  Sparkles, CheckCircle2, ShieldCheck, Eye, ArrowUpRight
} from 'lucide-react'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [activeDropdown, setActiveDropdown] = useState(null)
  const dropdownRef = useRef(null)
  
  // Form states
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [label, setLabel] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState(['view_dashboard', 'view_cameras'])
  const [selectedCameras, setSelectedCameras] = useState(['CAM-001'])
  const [selectedUsecases, setSelectedUsecases] = useState(['people_count'])
  const [formError, setFormError] = useState(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

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
    setActiveDropdown(null)
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
    setActiveDropdown(null)
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
    setActiveDropdown(null)
    if (confirm(`Are you sure you want to permanently delete user "${targetUsername}"?`)) {
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

  // Filter users
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase()
    return !q ||
      u.username.toLowerCase().includes(q) ||
      (u.label || '').toLowerCase().includes(q) ||
      (u.tenantId || '').toLowerCase().includes(q)
  })

  // Role resolution helper
  const getUserRole = (u) => {
    if (u.username === 'admin' || !u.tenantId) {
      return { title: 'Super Admin', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' }
    }
    if (u.permissions?.includes('manage_users')) {
      return { title: 'Tenant Admin', color: '#2563eb', bg: 'rgba(37,99,235,0.12)' }
    }
    if (u.permissions?.includes('view_events')) {
      return { title: 'Operator', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' }
    }
    return { title: 'Viewer', color: '#64748b', bg: 'rgba(100,116,139,0.12)' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 60, width: '100%' }}>
      
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              User Clearance Directory
            </h1>
            <span className="ai-badge ai-badge-cyan" style={{ fontSize: 9 }}>
              {users.length} REGISTERED
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
            Manage platform credentials, role clearance tiers, camera access rules, and AI suite whitelists.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: 210 }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search user, role, tenant..."
              style={{
                width: '100%', padding: '6px 10px 6px 28px',
                fontSize: 11, background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 7,
                color: 'var(--text)', outline: 'none'
              }}
            />
          </div>

          {/* Add User Button */}
          <button
            onClick={openAddModal}
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
              color: '#fff', border: 'none',
              padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(6,182,212,0.25)',
              transition: 'all 0.15s', whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <UserPlus size={13} />
            <span>+ ADD USER</span>
          </button>
        </div>
      </div>

      {/* ── VERTICAL DIRECTORY TABLE ── */}
      <div 
        className="ai-card"
        style={{ overflow: 'visible', padding: 0, width: '100%' }}
      >
        {/* Table Headings */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(140px, 1.3fr) minmax(110px, 0.9fr) minmax(120px, 1fr) minmax(105px, 0.9fr) 70px 115px',
          gap: 10,
          padding: '10px 14px',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          fontSize: 9.5,
          fontWeight: 800,
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          alignItems: 'center'
        }}>
          <div>USER</div>
          <div>ROLE</div>
          <div>PERMISSIONS</div>
          <div>FEEDS & SUITES</div>
          <div>STATUS</div>
          <div style={{ textAlign: 'right' }}>ACTIONS</div>
        </div>

        {/* Vertical Rows List (As users are added, they append vertically below) */}
        {filteredUsers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            No accounts found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredUsers.map((u, index) => {
              const isCurrent = currentUser?.username === u.username
              const role = getUserRole(u)
              const userPerms = u.permissions || []
              const userCams = u.allowedCameras || []
              const userUcs = u.allowedUsecases || []
              const isDropdownOpen = activeDropdown === u.username

              return (
                <div
                  key={u.username}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(140px, 1.3fr) minmax(110px, 0.9fr) minmax(120px, 1fr) minmax(105px, 0.9fr) 70px 115px',
                    gap: 10,
                    padding: '10px 14px',
                    borderBottom: index === filteredUsers.length - 1 ? 'none' : '1px solid var(--border)',
                    alignItems: 'center',
                    background: isCurrent ? 'var(--surface-2)' : 'transparent',
                    transition: 'background 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={e => {
                    if (!isCurrent) e.currentTarget.style.background = 'var(--surface-2)'
                  }}
                  onMouseLeave={e => {
                    if (!isCurrent) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Column 1: User Profile */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${role.color}, #3b82f6)`,
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 12, flexShrink: 0,
                      boxShadow: `0 2px 6px ${role.color}40`
                    }}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <div style={{ textAlign: 'left', minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: 'var(--text)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {u.label || u.username}
                        </span>
                        {isCurrent && (
                          <span style={{
                            fontSize: 7.5, fontWeight: 900, padding: '1px 4px', borderRadius: 3,
                            background: 'var(--accent-bg)', color: 'var(--accent)', textTransform: 'uppercase', flexShrink: 0
                          }}>
                            YOU
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 10, color: 'var(--text-3)', fontWeight: 600, marginTop: 1,
                        fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        @{u.username} {u.tenantId ? `· [${u.tenantId}]` : '· Super'}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: User Type / Role */}
                  <div style={{ minWidth: 0 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 9.5, fontWeight: 800,
                      padding: '2px 7px', borderRadius: 5,
                      background: role.bg, color: role.color,
                      border: `1px solid ${role.color}35`,
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap'
                    }}>
                      <Shield size={10} />
                      <span>{role.title}</span>
                    </span>
                  </div>

                  {/* Column 3: Feature Permissions */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, minWidth: 0 }}>
                    {userPerms.length === FEATURES.length ? (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5,
                        background: 'var(--ai-emerald-bg)', color: 'var(--ai-emerald)',
                        border: '1px solid var(--ai-emerald-border)', whiteSpace: 'nowrap'
                      }}>
                        All Access (6)
                      </span>
                    ) : (
                      FEATURES.filter(f => userPerms.includes(f.id)).slice(0, 2).map(f => (
                        <span key={f.id} style={{
                          fontSize: 8.5, fontWeight: 600, background: 'var(--surface)',
                          border: '1px solid var(--border)', color: 'var(--text-2)',
                          padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap'
                        }}>
                          {f.label}
                        </span>
                      ))
                    )}
                    {userPerms.length > 2 && userPerms.length !== FEATURES.length && (
                      <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--text-3)', alignSelf: 'center', whiteSpace: 'nowrap' }}>
                        +{userPerms.length - 2}
                      </span>
                    )}
                    {userPerms.length === 0 && (
                      <span style={{ fontSize: 9, color: 'var(--red)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                        None
                      </span>
                    )}
                  </div>

                  {/* Column 4: Permitted Cameras & Suites */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--accent)' }}>{userCams.length}</span> of {cameras.length} cams
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {userUcs.slice(0, 3).map(ucid => {
                        const uc = USE_CASES.find(x => x.id === ucid)
                        return (
                          <span key={ucid} style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: uc?.color || '#3b82f6',
                            boxShadow: `0 0 4px ${uc?.color || '#3b82f6'}`
                          }} title={uc?.label || ucid} />
                        )
                      })}
                      <span style={{ fontSize: 8.5, color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {userUcs.length} suites
                      </span>
                    </div>
                  </div>

                  {/* Column 5: Status */}
                  <div style={{ minWidth: 0 }}>
                    <span className="ai-badge ai-badge-emerald" style={{ fontSize: 8.5, padding: '2px 6px', gap: 4 }}>
                      <span className="live-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ai-emerald)' }} />
                      ACTIVE
                    </span>
                  </div>

                  {/* Column 6: Actions & Configuration Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, minWidth: 0 }}>
                    {/* Direct Edit Button */}
                    <button
                      onClick={() => openEditModal(u)}
                      title="Edit User Clearances"
                      style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.15s ease', flexShrink: 0
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--accent)'
                        e.currentTarget.style.borderColor = 'var(--accent)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--text-2)'
                        e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      <Edit2 size={12} />
                    </button>

                    {/* Direct Delete Button */}
                    <button
                      onClick={() => handleDelete(u.username)}
                      disabled={u.username === 'admin'}
                      title={u.username === 'admin' ? 'Super Admin cannot be deleted' : 'Delete Account'}
                      style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        color: u.username === 'admin' ? 'var(--text-3)' : 'var(--red)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: u.username === 'admin' ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease', flexShrink: 0
                      }}
                      onMouseEnter={e => {
                        if (u.username !== 'admin') {
                          e.currentTarget.style.background = 'var(--red-bg)'
                          e.currentTarget.style.borderColor = 'var(--red)'
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--surface)'
                        e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>

                    {/* Configuration Dropdown Button */}
                    <div style={{ position: 'relative' }} ref={isDropdownOpen ? dropdownRef : null}>
                      <button
                        onClick={() => setActiveDropdown(isDropdownOpen ? null : u.username)}
                        title="Configuration & Access Options"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          height: 26, padding: '0 6px', borderRadius: 6,
                          background: isDropdownOpen ? 'var(--surface-2)' : 'var(--surface)',
                          border: `1px solid ${isDropdownOpen ? 'var(--accent)' : 'var(--border)'}`,
                          color: isDropdownOpen ? 'var(--accent)' : 'var(--text-2)',
                          fontSize: 10, fontWeight: 700, cursor: 'pointer',
                          transition: 'all 0.15s ease', flexShrink: 0
                        }}
                      >
                        <SlidersHorizontal size={11} />
                        <ChevronDown size={10} />
                      </button>

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div style={{
                          position: 'absolute', right: 0, top: 'calc(100% + 5px)',
                          width: 200, background: 'var(--surface)',
                          border: '1px solid var(--border)', borderRadius: 8,
                          boxShadow: 'var(--shadow-lg)', zIndex: 100,
                          padding: '5px', display: 'flex', flexDirection: 'column', gap: 2,
                          animation: 'slideDown 0.18s ease'
                        }}>
                          <div style={{ padding: '4px 8px 3px', fontSize: 8.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Configuration
                          </div>

                          <button
                            onClick={() => openEditModal(u)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px',
                              borderRadius: 5, border: 'none', background: 'transparent',
                              color: 'var(--text)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                              width: '100%', textAlign: 'left', transition: 'background 0.12s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Edit2 size={11} style={{ color: 'var(--accent)' }} />
                            <span>Edit Clearances & Keys</span>
                          </button>

                          <button
                            onClick={() => openEditModal(u)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px',
                              borderRadius: 5, border: 'none', background: 'transparent',
                              color: 'var(--text)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                              width: '100%', textAlign: 'left', transition: 'background 0.12s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Camera size={11} style={{ color: 'var(--ai-emerald)' }} />
                            <span>Whitelisted Cameras ({userCams.length})</span>
                          </button>

                          <button
                            onClick={() => openEditModal(u)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px',
                              borderRadius: 5, border: 'none', background: 'transparent',
                              color: 'var(--text)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                              width: '100%', textAlign: 'left', transition: 'background 0.12s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Sparkles size={11} style={{ color: 'var(--ai-violet)' }} />
                            <span>Permitted Suites ({userUcs.length})</span>
                          </button>

                          <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />

                          <button
                            onClick={() => handleDelete(u.username)}
                            disabled={u.username === 'admin'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px',
                              borderRadius: 5, border: 'none', background: 'transparent',
                              color: u.username === 'admin' ? 'var(--text-3)' : 'var(--red)',
                              fontSize: 10.5, fontWeight: 600, cursor: u.username === 'admin' ? 'not-allowed' : 'pointer',
                              width: '100%', textAlign: 'left', transition: 'background 0.12s'
                            }}
                            onMouseEnter={e => {
                              if (u.username !== 'admin') e.currentTarget.style.background = 'var(--red-bg)'
                            }}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Trash2 size={11} />
                            <span>Remove Account</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SLIDE-OVER DRAWER MODAL ── */}
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
              width: 480, maxWidth: '100%', height: '100vh', background: 'var(--surface)',
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
                        borderRadius: 10, fontSize: 13, outline: 'none', background: editingUsername ? 'var(--surface-2)' : 'var(--surface)',
                        color: 'var(--text)', fontWeight: 600
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}><Key size={14} /></span>
                    <input
                      type="text"
                      placeholder="Assign access password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border)',
                        borderRadius: 10, fontSize: 13, outline: 'none', fontWeight: 600,
                        background: 'var(--surface)', color: 'var(--text)'
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
                      borderRadius: 10, fontSize: 13, outline: 'none', fontWeight: 600,
                      background: 'var(--surface)', color: 'var(--text)'
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
                      fontFamily: 'monospace', background: 'var(--surface)', color: 'var(--text)'
                    }}
                  />
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border)' }} />

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
                          border: `1px solid ${checked ? 'rgba(37,99,235,0.25)' : 'var(--border)'}`,
                          borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                          background: checked ? 'var(--accent)' : 'var(--surface)', display: 'flex', alignItems: 'center',
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

              <div style={{ height: '1px', background: 'var(--border)' }} />

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
                          border: `1px solid ${checked ? 'rgba(37,99,235,0.25)' : 'var(--border)'}`,
                          borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                          background: checked ? 'var(--accent)' : 'var(--surface)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#fff'
                        }}>
                          {checked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: checked ? 'var(--accent)' : 'var(--text)' }}>
                            {c.name || c.id}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                            ID: {c.id} · Location: {c.location || 'Zone'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border)' }} />

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
                          background: checked ? uc.color : 'var(--surface)', display: 'flex', alignItems: 'center',
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
