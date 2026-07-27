// ══════════════════════════════════════════════════════════════
//  ELECTRON PRELOAD SCRIPT
//
//  Exposes a minimal API to the renderer process via contextBridge.
//  The renderer (React app) can check window.electronAPI.isElectron
//  to detect it's running inside Electron vs a normal browser.
// ══════════════════════════════════════════════════════════════

const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
})
