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