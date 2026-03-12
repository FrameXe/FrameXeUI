import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout        from './components/layout/Layout.jsx'
import Dashboard     from './pages/Dashboard.jsx'
import CameraExplorer from './pages/CameraExplorer.jsx'
import CameraDetail  from './pages/CameraDetail.jsx'
import UseCaseView   from './pages/UseCaseView.jsx'
import EventsAlerts  from './pages/EventsAlerts.jsx'
import Reports       from './pages/Reports.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index                       element={<Dashboard />} />
          <Route path="cameras"              element={<CameraExplorer />} />
          <Route path="camera/:id"           element={<CameraDetail />} />
          <Route path="use-case/:useCaseId"  element={<UseCaseView />} />
          <Route path="events"               element={<EventsAlerts />} />
          <Route path="reports"              element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
