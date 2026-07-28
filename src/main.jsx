import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installLogCapture } from './lib/logCapture.js'

// Install global log capture BEFORE rendering
installLogCapture()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
