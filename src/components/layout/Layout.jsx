import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import TopBar from './TopBar.jsx'
import Sidebar from './Sidebar.jsx'
import { ErrorBoundary } from '../shared/ErrorBoundary.jsx'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  const toggleSidebar = () => setCollapsed(prev => !prev)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <TopBar onToggleSidebar={toggleSidebar} isSidebarCollapsed={collapsed} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: 'var(--bg)' }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

