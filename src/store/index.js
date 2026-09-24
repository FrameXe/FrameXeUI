import { create } from 'zustand'

// Simple stores — mostly hooks are self-managing now
export const useCameraStore = create((set, get) => ({
  cameras: [], loading: false, error: null,
  set:        (c) => set({ cameras: c }),
  setLoading: (v) => set({ loading: v }),
  setError:   (v) => set({ error: v }),
}))

export const useAlertStore = create((set, get) => ({
  alerts: [], total: 0, loading: false,
  set:        ({ data, total }) => set({ alerts: data||[], total: total||0 }),
  setLoading: (v) => set({ loading: v }),
  ack:        (id) => set(s => ({ alerts: s.alerts.map(a => a.id===id?{...a,acknowledged:true}:a) })),
  ackAll:     ()  => set(s => ({ alerts: s.alerts.map(a => ({...a,acknowledged:true})) })),
  unread:     ()  => get().alerts.filter(a => !a.acknowledged).length,
}))

export const useAnalyticsStore = create((set) => ({
  summary: null, setSummary: (d) => set({ summary: d }),
}))

// Per-camera line crossing IN/OUT counts — written by CanvasEditor, read by CameraAnalytics
export const useCrossStore = create((set, get) => ({
  counts: {},   // { [cameraId]: { in: 0, out: 0 } }
  addCrossing: (cameraId, dir) => set(s => {
    const prev = s.counts[cameraId] || { in: 0, out: 0 }
    return { counts: { ...s.counts, [cameraId]: { ...prev, [dir]: prev[dir] + 1 } } }
  }),
  setCounts: (cameraId, inCount, outCount) => set(s => ({
    counts: { ...s.counts, [cameraId]: { in: inCount, out: outCount } }
  })),
  reset: (cameraId) => set(s => ({ counts: { ...s.counts, [cameraId]: { in: 0, out: 0 } } })),
  get: (cameraId) => get().counts[cameraId] || { in: 0, out: 0 },
}))

// Persisted detection log store — survives page navigation
// detLog, inFrame, seenVehicleIds, seenPeopleIds are kept per cameraId in memory
export const useDetectionStore = create((set, get) => ({
  // { [cameraId]: { detLog: [], inFrame: {}, seenVehicleIds: Set, seenPeopleIds: Set } }
  data: {},

  getForCamera: (cameraId) => {
    return get().data[cameraId] || {
      detLog: [],
      inFrame: {},
      seenVehicleIds: new Set(),
      seenPeopleIds: new Set(),
    }
  },

  appendDetLog: (cameraId, newEntries) => set(s => {
    const prev = s.data[cameraId] || { detLog: [], inFrame: {}, seenVehicleIds: new Set(), seenPeopleIds: new Set() }
    return {
      data: {
        ...s.data,
        [cameraId]: {
          ...prev,
          detLog: [...newEntries, ...prev.detLog].slice(0, 200),
        }
      }
    }
  }),

  setInFrame: (cameraId, uc, count) => set(s => {
    const prev = s.data[cameraId] || { detLog: [], inFrame: {}, seenVehicleIds: new Set(), seenPeopleIds: new Set() }
    return {
      data: {
        ...s.data,
        [cameraId]: {
          ...prev,
          inFrame: { ...prev.inFrame, [uc]: count }
        }
      }
    }
  }),

  addSeenVehicleIds: (cameraId, ids) => set(s => {
    const prev = s.data[cameraId] || { detLog: [], inFrame: {}, seenVehicleIds: new Set(), seenPeopleIds: new Set() }
    const next = new Set(prev.seenVehicleIds)
    ids.forEach(id => next.add(id))
    return { data: { ...s.data, [cameraId]: { ...prev, seenVehicleIds: next } } }
  }),

  addSeenPeopleIds: (cameraId, ids) => set(s => {
    const prev = s.data[cameraId] || { detLog: [], inFrame: {}, seenVehicleIds: new Set(), seenPeopleIds: new Set() }
    const next = new Set(prev.seenPeopleIds)
    ids.forEach(id => next.add(id))
    return { data: { ...s.data, [cameraId]: { ...prev, seenPeopleIds: next } } }
  }),
}))

// Dynamic user directory list helper
const loadDynamicUsers = () => {
  try {
    const saved = localStorage.getItem('vframe_dynamic_users')
    if (saved) {
      const parsed = JSON.parse(saved)
      let migrated = false
      const list = parsed.map(u => {
        if (!u.allowedUsecases) {
          migrated = true
          return {
            ...u,
            allowedUsecases: u.username === 'admin'
              ? ['people_count', 'traffic', 'intrusion', 'crowd_alert', 'vehicle_speed']
              : ['people_count', 'intrusion', 'crowd_alert']
          }
        }
        return u
      })
      if (migrated) {
        localStorage.setItem('vframe_dynamic_users', JSON.stringify(list))
      }
      return list
    }
  } catch (e) {}

  const defaults = [
    {
      username: 'admin',
      password: 'admin123',
      label: 'Super Admin',
      permissions: ['view_dashboard', 'view_cameras', 'view_reports', 'view_events', 'manage_cameras', 'manage_users'],
      allowedCameras: ['CAM-001', 'CAM-002', 'CAM-003', 'CAM-004', 'CAM-005'],
      allowedUsecases: ['people_count', 'traffic', 'intrusion', 'crowd_alert', 'vehicle_speed'],
    },
    {
      username: 'operator',
      password: 'password',
      label: 'Operator',
      permissions: ['view_dashboard', 'view_cameras', 'view_events'],
      allowedCameras: ['CAM-001', 'CAM-004'],
      allowedUsecases: ['people_count', 'intrusion', 'crowd_alert'],
      tenantId: 'tenant_demo',
    }
  ]
  localStorage.setItem('vframe_dynamic_users', JSON.stringify(defaults))
  return defaults
}

// Auth store: App startup always prompts for credentials first
try {
  localStorage.removeItem('vframe_auth_user')
} catch (e) {}

export const useAuthStore = create((set, get) => ({
  user: null,
  users: loadDynamicUsers(),
  error: null,
  
  login: (username, password) => {
    set({ error: null })
    
    const matchedUser = get().users.find(
      u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
    )

    if (matchedUser) {
      localStorage.setItem('vframe_auth_user', JSON.stringify(matchedUser))
      if (matchedUser.tenantId) {
        localStorage.setItem('vframe_selected_tenant', matchedUser.tenantId)
      } else if (matchedUser.username !== 'admin') {
        localStorage.setItem('vframe_selected_tenant', 'tenant_demo')
      }
      set({ user: matchedUser, error: null })
      return true
    } else {
      set({ error: 'Invalid username or password' })
      return false
    }
  },

  
  logout: () => {
    localStorage.removeItem('vframe_auth_user')
    set({ user: null, error: null })
  },
  
  hasPermission: (permission) => {
    const user = get().user
    if (!user) return false
    return user.permissions.includes(permission)
  },
  
  hasCameraAccess: (cameraId) => {
    const user = get().user
    if (!user) return false
    if (user.username === 'admin' || !user.allowedCameras) return true
    const allowed = Array.isArray(user.allowedCameras) ? user.allowedCameras : []
    return allowed.some(c => {
      if (typeof c !== 'string' || typeof cameraId !== 'string') return false
      const cClean = c.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      const idClean = cameraId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      return c.toLowerCase() === cameraId.toLowerCase() || cClean === idClean
    })
  },

  hasUseCaseAccess: (useCaseId) => {
    const user = get().user
    if (!user) return false
    if (!user.allowedUsecases) return true
    return user.allowedUsecases.includes(useCaseId)
  },

  createUser: (newUser) => {
    const users = get().users
    if (users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase().trim())) {
      throw new Error('User already exists')
    }
    const updatedUsers = [...users, { ...newUser, username: newUser.username.trim() }]
    localStorage.setItem('vframe_dynamic_users', JSON.stringify(updatedUsers))
    set({ users: updatedUsers })
  },

  updateUser: (username, updatedFields) => {
    const users = get().users
    const updatedUsers = users.map(u => 
      u.username === username ? { ...u, ...updatedFields } : u
    )
    localStorage.setItem('vframe_dynamic_users', JSON.stringify(updatedUsers))
    
    // Sync current session if details changed
    const currentUser = get().user
    if (currentUser && currentUser.username === username) {
      const updatedMe = updatedUsers.find(u => u.username === username)
      localStorage.setItem('vframe_auth_user', JSON.stringify(updatedMe))
      set({ user: updatedMe })
    }

    set({ users: updatedUsers })
  },

  deleteUser: (username) => {
    if (username === 'admin') {
      throw new Error('Cannot delete main administrator')
    }
    
    const users = get().users
    const updatedUsers = users.filter(u => u.username !== username)
    localStorage.setItem('vframe_dynamic_users', JSON.stringify(updatedUsers))
    
    // Log out if current user is deleted
    const currentUser = get().user
    if (currentUser && currentUser.username === username) {
      localStorage.removeItem('vframe_auth_user')
      set({ user: null })
    }

    set({ users: updatedUsers })
  }
}))