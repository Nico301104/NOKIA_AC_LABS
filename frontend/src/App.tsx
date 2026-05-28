import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tickets from './pages/Tickets'
import ProtectedRoute from './components/ProtectedRoute'

// Definitia rutelor aplicatiei:
// - / si orice ruta necunoscuta redirecteaza la /login
// - /dashboard si /tickets sunt protejate — necesita autentificare
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets"
        element={
          <ProtectedRoute>
            <Tickets />
          </ProtectedRoute>
        }
      />
      {/* Orice alta ruta redirecteaza la login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
