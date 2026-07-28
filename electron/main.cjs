// ══════════════════════════════════════════════════════════════
//  ELECTRON MAIN PROCESS & EMBEDDED RTSP DECODER SERVER
//
//  Dev mode  → loads Vite dev server (http://localhost:5173)
//  Prod mode → loads dist/index.html (packaged build)
//
//  Features embedded Node.js RTSP Streamer on port 9990:
//  Decodes RTSP streams directly on the user's Windows machine
//  using FFmpeg without requiring any cloud streaming server!
// ══════════════════════════════════════════════════════════════

const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('path')
const http = require('http')
const { spawn, execSync } = require('child_process')
const fs = require('fs')

const isDev = !app.isPackaged
let mainWindow = null

// Active FFmpeg processes: url → { proc, clients: Set<http.ServerResponse> }
const activeStreams = new Map()

// Locate FFmpeg binary on Windows
function findFfmpeg() {
  const possiblePaths = [
    path.join(process.resourcesPath, 'ffmpeg.exe'),
    'C:\\WorkSpace\\FRAMEXE_ALL_ELEMENTS\\video_detection_element_runall\\initial_Stream_Manager\\packaging\\windows\\ffmpeg.exe',
    path.join(process.cwd(), 'initial_Stream_Manager', 'packaging', 'windows', 'ffmpeg.exe'),
    path.join(__dirname, '..', '..', 'initial_Stream_Manager', 'packaging', 'windows', 'ffmpeg.exe'),
    path.join(app.getAppPath(), 'ffmpeg.exe'),
    'ffmpeg.exe',
    'ffmpeg',
  ]
  for (const p of possiblePaths) {
    try {
      if (p && fs.existsSync(p)) return p
    } catch (_) {}
  }
  return 'ffmpeg'
}

let ffmpegBin = findFfmpeg()
console.log(`[Electron RTSP Server] Using FFmpeg binary: ${ffmpegBin}`)

// Start local HTTP server on port 9990 for direct RTSP playback
const RTSP_SERVER_PORT = 9990
const rtspServer = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${RTSP_SERVER_PORT}`)

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', activeStreams: activeStreams.size, ffmpegBin }))
    return
  }

  if (parsedUrl.pathname === '/stream') {
    const targetRtsp = parsedUrl.searchParams.get('url')
    if (!targetRtsp) {
      res.writeHead(400, { 'Content-Type': 'text/plain' })
      res.end('Missing "url" query parameter')
      return
    }

    console.log(`[Electron RTSP Server] Stream requested: ${targetRtsp}`)

    // Re-check ffmpeg binary if default was fallback
    if (!fs.existsSync(ffmpegBin)) {
      ffmpegBin = findFfmpeg()
    }

    // HTTP Multipart MJPEG headers for native 30 FPS video streaming
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=ffmpeg',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'close',
      'Pragma': 'no-cache',
    })

    let streamObj = activeStreams.get(targetRtsp)

    if (!streamObj) {
      const args = [
        '-loglevel', 'error',
        '-rtsp_transport', 'tcp',
        '-i', targetRtsp,
        '-an',
        '-c:v', 'mjpeg',
        '-q:v', '4',
        '-r', '25',
        '-f', 'mpjpeg',
        '-boundary_tag', 'ffmpeg',
        '-',
      ]

      console.log(`[Electron RTSP Server] Spawning FFmpeg (${ffmpegBin}) for ${targetRtsp}...`)
      let proc
      try {
        proc = spawn(ffmpegBin, args, { windowsHide: true })
      } catch (spawnErr) {
        console.error(`[Electron RTSP Server] Failed to spawn FFmpeg: ${spawnErr.message}`)
        res.end()
        return
      }

      streamObj = { proc, clients: new Set() }
      activeStreams.set(targetRtsp, streamObj)

      proc.on('error', (err) => {
        console.error(`[Electron RTSP Server] FFmpeg process error: ${err.message}`)
        activeStreams.delete(targetRtsp)
        for (const clientRes of streamObj.clients) {
          try { clientRes.end() } catch (_) {}
        }
      })

      proc.stdout.on('data', (chunk) => {
        for (const clientRes of streamObj.clients) {
          try {
            clientRes.write(chunk)
          } catch (_) {
            streamObj.clients.delete(clientRes)
          }
        }
      })

      proc.on('exit', (code) => {
        console.log(`[Electron RTSP Server] FFmpeg exited (code ${code}) for ${targetRtsp}`)
        activeStreams.delete(targetRtsp)
        for (const clientRes of streamObj.clients) {
          try { clientRes.end() } catch (_) {}
        }
      })

      proc.stderr.on('data', (data) => {
        console.error(`[FFmpeg Error] ${data.toString().trim()}`)
      })
    }

    streamObj.clients.add(res)

    req.on('close', () => {
      if (streamObj) {
        streamObj.clients.delete(res)
        console.log(`[Electron RTSP Server] Client disconnected. Remaining listeners for stream: ${streamObj.clients.size}`)
        if (streamObj.clients.size === 0) {
          // Kill FFmpeg process after 3 seconds of no active viewers
          setTimeout(() => {
            if (streamObj.clients.size === 0 && activeStreams.has(targetRtsp)) {
              console.log(`[Electron RTSP Server] Stopping FFmpeg process for ${targetRtsp}`)
              try { streamObj.proc.kill('SIGKILL') } catch (_) {}
              activeStreams.delete(targetRtsp)
            }
          }, 3000)
        }
      }
    })

    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
})

rtspServer.listen(RTSP_SERVER_PORT, '127.0.0.1', () => {
  console.log(`[Electron RTSP Server] Running on http://127.0.0.1:${RTSP_SERVER_PORT}`)
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'FrameXe — Video Analytics Platform',
    backgroundColor: '#0a0e1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: true,
    show: false,
  })

  // ── Load the app ──────────────────────────────────────────
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // ── Show window once content is ready ─────────────────────
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  // ── Open external links in default browser ────────────────
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.includes(`127.0.0.1:${RTSP_SERVER_PORT}`)) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // ── DevTools & Reload shortcuts ───────────────────────────
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools()
    }
    if (input.control && input.key.toLowerCase() === 'r') {
      mainWindow.webContents.reload()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ── App lifecycle ────────────────────────────────────────────
if (!isDev) {
  Menu.setApplicationMenu(null)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  // Clean up all active FFmpeg processes
  for (const [, obj] of activeStreams) {
    try { obj.proc.kill('SIGKILL') } catch (_) {}
  }
  activeStreams.clear()
  try { rtspServer.close() } catch (_) {}
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// ── Security: block unhandled navigation ─────────────────────
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (isDev && url.startsWith('http://localhost:5173')) return
    if (!url.startsWith('file://') && !url.startsWith('http://localhost:5173')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
})
