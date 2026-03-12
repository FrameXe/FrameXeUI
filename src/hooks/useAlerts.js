import { useEffect } from 'react'
import { useAlertStore } from '../store/index.js'
import { alertAPI } from '../services/api.js'

export function useAlerts() {
  const store = useAlertStore()
  useEffect(() => {
    store.setLoading(true)
    alertAPI.getAll().then(store.set).finally(() => store.setLoading(false))
  }, [])
  return {
    alerts:   store.alerts,
    loading:  store.loading,
    unread:   store.unread(),
    ack:      (id) => { alertAPI.acknowledge(id); store.ack(id) },
    ackAll:   ()   => { alertAPI.acknowledgeAll(); store.ackAll() },
  }
}
