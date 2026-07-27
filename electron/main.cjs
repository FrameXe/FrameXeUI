// ══════════════════════════════════════════════════════════════
//  ELECTRON MAIN PROCESS
//
//  Dev mode  → loads Vite dev server (http://localhost:5173)
//  Prod mode → loads dist/index.html (packaged build)
//
//  This is CommonJS (.cjs) because package.json has "type": "module"
//  and Electron's main process needs require() for built-in modules.
// ══════════════════════════════════════════════════════════════

const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('path')

const isDev = !app.isPackaged

let mainWindow = null

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
    // Dev: Vite dev server with HMR + proxy
    mainWindow.loadURL('http://localhost:5173')
  } else {
    // Prod: load from packaged dist
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // ── Show window once content is ready (avoids white flash) ─
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  // ── Open external links in default system browser ──────────
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // ── DevTools shortcut in dev mode ──────────────────────────
  if (isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        mainWindow.webContents.toggleDevTools()
      }
      // Ctrl+R for reload
      if (input.control && input.key === 'r') {
        mainWindow.webContents.reload()
      }
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ── Remove default menu in production ────────────────────────
if (!isDev) {
  Menu.setApplicationMenu(null)
}

// ── App lifecycle ────────────────────────────────────────────
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// ── Security: block new window creation ──────────────────────
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    // Allow navigation within the app only
    if (isDev && url.startsWith('http://localhost:5173')) return
    if (!url.startsWith('file://') && !url.startsWith('http://localhost:5173')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
})
