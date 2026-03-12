import { create } from 'zustand'

// ── Camera Store ───────────────────────────────────────────────
export const useCameraStore = create((set, get) => ({
  cameras: [], loading: false, error: null,
  set: (cameras) => set({ cameras }),
  setLoading: (v) => set({ loading: v }),
  setError:   (v) => set({ error: v }),
  byId:    (id) => get().cameras.find(c => c.id === id) || null,
  byUC:    (uc) => get().cameras.filter(c => c.useCase === uc),
}))

// ── Alert Store ────────────────────────────────────────────────
export const useAlertStore = create((set, get) => ({
  alerts: [], loading: false,
  set:        (alerts) => set({ alerts }),
  setLoading: (v) => set({ loading: v }),
  push:       (a) => set(s => ({ alerts: [a, ...s.alerts] })),
  ack:        (id) => set(s => ({ alerts: s.alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a) })),
  ackAll:     ()   => set(s => ({ alerts: s.alerts.map(a => ({ ...a, acknowledged: true })) })),
  unread:     ()   => get().alerts.filter(a => !a.acknowledged).length,
}))

// ── Detection Store (tables/reports ke liye) ───────────────────
export const useDetStore = create((set, get) => ({
  data: {}, loading: {},
  set:        (type, d)  => set(s => ({ data:    { ...s.data,    [type]: d    } })),
  setLoading: (type, v)  => set(s => ({ loading: { ...s.loading, [type]: v   } })),
  get:        (type)     => get().data[type] || [],
  isLoading:  (type)     => get().loading[type] || false,
}))
