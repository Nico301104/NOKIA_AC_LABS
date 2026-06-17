import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout/AppLayout'
import { DashboardPage } from './pages/dashboard/DashBoardPage'
import {Chat} from './pages/aichat/Chat'

export default function App() {
  return (
    <Routes>
      {/* Login — standalone, fara navbar/shell */}
      <Route path="/login" element={<Login />} />

      {/* Toate paginile cu navigatie impart acelasi shell (navbar unic + tranzitii) */}
      <Route element={<AppLayout />}>
        {/* Landing: dashboard-ul de tichete */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard tichete (protejat) — landing dupa login */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* KPI */}
        <Route path="/kpi" element={<DashboardPage />} />

        {/* Asistent chat AI */}
        <Route
          path="/chat"
          element={
            <div className="chat-page">
              <Chat />
            </div>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
