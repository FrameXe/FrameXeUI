import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Layout        from './components/layout/Layout.jsx'
import Dashboard     from './pages/Dashboard.jsx'
import CameraExplorer from './pages/CameraExplorer.jsx'
import CameraDetail  from './pages/CameraDetail.jsx'
import TrafficDetails from './pages/TrafficDetails.jsx'
import EventsAlerts  from './pages/EventsAlerts.jsx'
import Reports       from './pages/Reports.jsx'
import CameraManagement from './pages/CameraManagement.jsx'
import Login from './pages/Login.jsx'
import AccessDenied from './pages/AccessDenied.jsx'
import UserManagement from './pages/UserManagement.jsx'

import PeopleDetails from './pages/PeopleDetails.jsx'
import CrowdDetails from './pages/CrowdDetails.jsx'
import IntrusionDetails from './pages/IntrusionDetails.jsx'

import CameraAnalytics from './pages/CameraAnalytics.jsx'

import { useAuthStore } from './store/index.js'

function ProtectedRoute({ permission }) {
  const user = useAuthStore(s => s.user)
  const hasPermission = useAuthStore(s => s.hasPermission)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index                       element={<Dashboard />} />
            <Route path="cameras"              element={<CameraExplorer />} />
            <Route path="camera/:id"           element={<CameraDetail />} />
            <Route path="camera/:id/traffic"   element={<CameraAnalytics />} />
            <Route path="camera/:id/traffic/:usecase" element={<CameraAnalytics />} />
            <Route path="camera/:id/people_count" element={<CameraAnalytics />} />
            <Route path="camera/:id/crowd_alert"  element={<CameraAnalytics />} />
            <Route path="camera/:id/intrusion"    element={<CameraAnalytics />} />
            <Route path="use-case/:useCaseId"  element={<CameraExplorer />} />
            
            <Route element={<ProtectedRoute permission="view_events" />}>
              <Route path="events"             element={<EventsAlerts />} />
            </Route>
            
            <Route element={<ProtectedRoute permission="view_reports" />}>
              <Route path="reports"            element={<Reports />} />
            </Route>
            
            <Route element={<ProtectedRoute permission="manage_cameras" />}>
              <Route path="camera-management"  element={<CameraManagement />} />
            </Route>

            <Route element={<ProtectedRoute permission="manage_users" />}>
              <Route path="user-management"    element={<UserManagement />} />
            </Route>

            <Route path="access-denied"        element={<AccessDenied />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

