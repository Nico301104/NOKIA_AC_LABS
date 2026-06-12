import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import { HomePage } from './pages/home/HomePage'
import { DashboardPage } from './pages/dashboard/DashBoardPage'

export default function App() {
  return (
    <Routes>
      {/* Modul 2 — landing page */}
      <Route path="/" element={<HomePage />} />

      {/* Modul 1 — autentificare + dashboard tichete */}
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Modul 2 — KPI dashboard */}
      <Route path="/kpi" element={<DashboardPage />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
