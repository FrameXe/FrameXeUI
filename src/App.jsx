import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout        from './components/layout/Layout.jsx'
import Dashboard     from './pages/Dashboard.jsx'
import CameraExplorer from './pages/CameraExplorer.jsx'
import CameraDetail  from './pages/CameraDetail.jsx'
import TrafficDetails from './pages/TrafficDetails.jsx'
import EventsAlerts  from './pages/EventsAlerts.jsx'
import Reports       from './pages/Reports.jsx'
import CameraManagement from './pages/CameraManagement.jsx'

import PeopleDetails from './pages/PeopleDetails.jsx'
import CrowdDetails from './pages/CrowdDetails.jsx'
import IntrusionDetails from './pages/IntrusionDetails.jsx'

import CameraAnalytics from './pages/CameraAnalytics.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
          <Route path="events"               element={<EventsAlerts />} />
          <Route path="reports"              element={<Reports />} />
          <Route path="camera-management"    element={<CameraManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
