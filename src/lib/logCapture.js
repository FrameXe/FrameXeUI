// ══════════════════════════════════════════════════════════════
//  LOG CAPTURE SERVICE
//
//  Intercepts window-level console.error, console.warn, console.log
//  and stores them in memory so the DiagnosticPanel can display them.
//  Also captures unhandled promise rejections and JS errors.
// ══════════════════════════════════════════════════════════════

const MAX_LOGS = 500

let logs = []
let subscribers = []

function notify() {
  subscribers.forEach(fn => fn([...logs]))
}

export function subscribe(fn) {
  subscribers.push(fn)
  fn([...logs]) // immediately send current logs
  return () => {
    subscribers = subscribers.filter(s => s !== fn)
  }
}

export function getLogs() {
  return [...logs]
}

export function clearLogs() {
  logs = []
  notify()
}

function pushLog(level, args, source = 'console') {
  const message = args
    .map(a => {
      if (typeof a === 'string') return a
      try { return JSON.stringify(a, null, 2) } catch { return String(a) }
    })
    .join(' ')

  const entry = {
    id: Date.now() + Math.random(),
    level,     // 'error' | 'warn' | 'info' | 'log' | 'webrtc'
    message,
    source,
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }),
  }

  logs = [entry, ...logs].slice(0, MAX_LOGS)
  notify()
}

// Specialized emitter for WebRTC/Stream diagnostics
export function logDiag(level, message) {
  pushLog(level, [message], 'webrtc')
}

let installed = false

export function installLogCapture() {
  if (installed || typeof window === 'undefined') return
  installed = true

  const origError = console.error.bind(console)
  const origWarn  = console.warn.bind(console)
  const origLog   = console.log.bind(console)
  const origInfo  = console.info.bind(console)

  console.error = (...args) => { origError(...args); pushLog('error', args) }
  console.warn  = (...args) => { origWarn(...args);  pushLog('warn',  args) }
  console.log   = (...args) => { origLog(...args);   pushLog('log',   args) }
  console.info  = (...args) => { origInfo(...args);  pushLog('info',  args) }

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    pushLog('error', [`[UnhandledRejection] ${e.reason?.message || e.reason || 'Unknown'}`], 'runtime')
  })

  // Catch global JS errors
  window.addEventListener('error', (e) => {
    pushLog('error', [`[GlobalError] ${e.message} @ ${e.filename}:${e.lineno}`], 'runtime')
  })

  pushLog('info', ['[LogCapture] Console capture started. All logs will appear here.'], 'system')
}
