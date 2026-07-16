// ══════════════════════════════════════════════════════════════
//  SSE MANAGER — Singleton
//  Manages all EventSource connections across the app.
//  Single connection per URL, shared across all subscribers.
//  Auto-reconnects on error (3s backoff).
//
//  FIX: When a new event name is subscribed AFTER the connection
//  is already open, we dynamically add the addEventListener so
//  it is never missed. This fixes the vehicle_count detection
//  issue where u2/u3 subscriptions were registering callbacks
//  in the listener map but NOT on the EventSource itself.
// ══════════════════════════════════════════════════════════════

class SSEManager {
  constructor() {
    this.connections      = {}  // connectionKey → EventSource
    this.listeners        = {}  // connectionKey → Map<eventName, Set<callback>>
    this.statusListeners  = {}  // connectionKey → Set<fn(status)>
    this.reconnectTimers  = {}  // connectionKey → setTimeout handle
    this.registeredEvents = {} // connectionKey → Set<eventName already on EventSource>
    this.BASE_URL         = import.meta.env.VITE_API_URL || ''
  }

  // ── Subscribe ──────────────────────────────────────────────
  // url            : full URL string  e.g. /api/sse/cameras/X/detections/vehicle_count
  // eventName      : SSE event name   e.g. 'vehicle_count', 'detection', 'message'
  // callback       : fn(data) called with parsed JSON on each event
  // onStatusChange : optional fn(status) where status is 'connected' | 'connecting' | 'disconnected'
  // Returns        : unsubscribe() function
  subscribe(url, eventName, callback, onStatusChange = null) {
    const key = url

    // Init listener maps for this connection
    if (!this.listeners[key])       this.listeners[key]       = new Map()
    if (!this.registeredEvents[key]) this.registeredEvents[key] = new Set()
    if (!this.statusListeners[key])  this.statusListeners[key]  = new Set()

    // Init set for this event name
    if (!this.listeners[key].has(eventName)) {
      this.listeners[key].set(eventName, new Set())
    }
    this.listeners[key].get(eventName).add(callback)

    if (onStatusChange) {
      this.statusListeners[key].add(onStatusChange)
      // Call immediately if connection already exists
      const es = this.connections[key]
      if (es) {
        const stateMap = { 0: 'connecting', 1: 'connected', 2: 'disconnected' }
        onStatusChange(stateMap[es.readyState] || 'disconnected')
      } else {
        onStatusChange('connecting')
      }
    }

    // Open connection if not already open
    if (!this.connections[key]) {
      this._createConnection(url, key)
    } else {
      // Connection already exists — dynamically add event listener if not registered yet
      this._ensureEventListener(key, eventName)
    }

    // Return unsubscribe
    return () => {
      if (onStatusChange) {
        this.statusListeners[key]?.delete(onStatusChange)
      }

      const eventSet = this.listeners[key]?.get(eventName)
      if (eventSet) {
        eventSet.delete(callback)
        if (eventSet.size === 0) {
          this.listeners[key].delete(eventName)
        }
      }

      // Close connection if no more listeners
      if (this.listeners[key]?.size === 0) {
        this._closeConnection(key)
      }
    }
  }

  // ── Ensure EventSource has listener for this event name ────
  _ensureEventListener(key, eventName) {
    if (this.registeredEvents[key]?.has(eventName)) return  // already registered
    const es = this.connections[key]
    if (!es) return

    // 'message' event is always covered by es.onmessage — skip to avoid double dispatch
    if (eventName === 'message') {
      this.registeredEvents[key].add(eventName)
      return
    }

    es.addEventListener(eventName, (e) => this._dispatch(key, eventName, e.data))
    this.registeredEvents[key].add(eventName)
    console.log('[SSE] +listener:', eventName, 'on', key)
  }

  // ── Dispatch parsed data to all callbacks for an event ─────
  _dispatch(key, eventName, rawData) {
    try {
      const data = JSON.parse(rawData)
      this.listeners[key]?.get(eventName)?.forEach(cb => cb(data))
    } catch (err) {
      console.error('[SSE] Parse error on event:', eventName, err, 'raw:', rawData?.slice?.(0, 100))
    }
  }

  // ── Dispatch connection status ─────────────────────────────
  _dispatchStatus(key, status) {
    this.statusListeners[key]?.forEach(cb => {
      try {
        cb(status)
      } catch (err) {
        console.error('[SSE] Status callback error:', err)
      }
    })
  }

  // ── Create EventSource ─────────────────────────────────────
  _createConnection(url, key) {
    console.log('[SSE] Connecting:', url)
    this._dispatchStatus(key, 'connecting')

    const fullUrl = url.startsWith('http') ? url : `${this.BASE_URL}${url}`
    const es = new EventSource(fullUrl, { withCredentials: false })

    this.connections[key]      = es
    this.registeredEvents[key] = new Set()

    es.onopen = () => {
      console.log('[SSE] Connected:', key)
      this._dispatchStatus(key, 'connected')
    }

    es.onerror = () => {
      console.warn('[SSE] Error on:', key, '— will retry in 3s')
      this._dispatchStatus(key, 'disconnected')
      this._handleError(key, url)
    }

    // Register named event listeners for all currently-known event names
    if (this.listeners[key]) {
      for (const eventName of this.listeners[key].keys()) {
        if (eventName === 'message') continue  // handled by onmessage below
        es.addEventListener(eventName, (e) => this._dispatch(key, eventName, e.data))
        this.registeredEvents[key].add(eventName)
      }
    }

    // Generic fallback for unnamed `data:` events (no `event:` field in SSE)
    es.onmessage = (e) => {
      // Fire BOTH 'message' subscribers AND any unnamed-event fallback
      this._dispatch(key, 'message', e.data)

      // Also broadcast to all other event listeners as a fallback
      if (this.listeners[key]) {
        for (const [evName, callbacks] of this.listeners[key].entries()) {
          if (evName === 'message') continue  // already dispatched above
          try {
            const data = JSON.parse(e.data)
            callbacks.forEach(cb => cb(data))
          } catch (_) {}
        }
      }
    }
  }

  // ── Handle Error / Reconnect ───────────────────────────────
  _handleError(key, url) {
    this.connections[key]?.close()
    delete this.connections[key]
    delete this.registeredEvents[key]

    // Reconnect only if there are still active listeners
    if (this.listeners[key]?.size > 0) {
      clearTimeout(this.reconnectTimers[key])
      this.reconnectTimers[key] = setTimeout(() => {
        if (this.listeners[key]?.size > 0) {
          console.log('[SSE] Reconnecting:', key)
          this._createConnection(url, key)
        }
      }, 3000)
    }
  }

  // ── Close Connection ───────────────────────────────────────
  _closeConnection(key) {
    clearTimeout(this.reconnectTimers[key])
    this.connections[key]?.close()
    delete this.connections[key]
    delete this.listeners[key]
    delete this.registeredEvents[key]
    delete this.reconnectTimers[key]
    delete this.statusListeners[key]
    console.log('[SSE] Closed:', key)
  }

  // ── Get Status ─────────────────────────────────────────────
  // Returns: 0=CONNECTING, 1=OPEN, 2=CLOSED, null=not found
  getStatus(key) {
    return this.connections[key]?.readyState ?? null
  }
}

// ── Singleton export ───────────────────────────────────────────
export const sseManager = new SSEManager()

