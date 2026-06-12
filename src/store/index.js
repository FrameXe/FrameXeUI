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
    }
  ]
  localStorage.setItem('vframe_dynamic_users', JSON.stringify(defaults))
  return defaults
}

// Auth store with localStorage persistence
const initialUser = (() => {
  try {
    const saved = localStorage.getItem('vframe_auth_user')
    return saved ? JSON.parse(saved) : null
  } catch (e) {
    return null
  }
})()

export const useAuthStore = create((set, get) => ({
  user: initialUser,
  users: loadDynamicUsers(),
  error: null,
  
  login: (username, password) => {
    set({ error: null })
    
    const matchedUser = get().users.find(
      u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
    )

    if (matchedUser) {
      localStorage.setItem('vframe_auth_user', JSON.stringify(matchedUser))
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
    return user.allowedCameras.includes(cameraId)
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