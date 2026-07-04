// ══════════════════════════════════════════════════════════════
//  useSSE — Generic SSE React hook
//  Subscribes to one SSE event on a URL via the singleton manager.
//  Cleans up automatically on unmount or when url/eventName changes.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { sseManager } from '../lib/sseManager.js'

// url         : full or relative URL, or null to skip
// eventName   : SSE event name  e.g. 'alert', 'traffic'
// initialState: initial value of data (default null)
// accumulate  : if true, new events are prepended to array (for feeds)
export function useSSE(url, eventName, initialState = null, accumulate = false) {
  const [data,      setData]      = useState(initialState)
  const [connected, setConnected] = useState(false)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    if (!url) return  // skip if cameraId is null/undefined

    const unsubscribe = sseManager.subscribe(url, eventName, (newData) => {
      if (accumulate) {
        setData(prev => {
          const arr = Array.isArray(prev) ? prev : []
          return [newData, ...arr].slice(0, 100)  // keep latest 100
        })
      } else {
        setData(newData)
      }
      setConnected(true)
      setError(null)
    })

    return () => {
      unsubscribe()
      setConnected(false)
    }
  }, [url, eventName])  // eslint-disable-line react-hooks/exhaustive-deps

  return { data, connected, error }
}
