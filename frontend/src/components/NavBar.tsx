import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../pages/Dashboard.css'

export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navBtn = (path: string, label: string) => {
    const active = location.pathname === path
    return (
      <button
        onClick={() => navigate(path)}
        style={{
          padding: '0.35rem 0.9rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.15em',
          borderRadius: '6px',
          cursor: 'pointer',
          border: active ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
          background: active ? 'rgba(37,99,235,0.08)' : 'transparent',
          color: active ? 'var(--violet-700)' : 'var(--text-muted)',
          transition: 'all 0.15s',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <nav className="db-nav">
      <div className="db-nav-brand">
        <div className="db-nav-logo">
          <svg viewBox="0 0 40 40" fill="none">
            <path d="M8 20 L14 14 L20 20 L26 14 L32 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="20" cy="28" r="2" fill="currentColor"/>
          </svg>
        </div>
        <div>
          <div className="db-nav-title">NOKIA</div>
          <div className="db-nav-sub">TICKET FILTER</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {navBtn('/dashboard', 'DASHBOARD')}
        {navBtn('/tickets', 'TICHETE')}
      </div>

      <div className="db-nav-right">
        <div className="db-nav-user">
          <span className="db-nav-username">{user?.username}</span>
          <span className="db-nav-role">{user?.team?.toUpperCase()}</span>
        </div>
        <div className="db-nav-sep" />
        <button className="db-nav-logout" onClick={handleLogout}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          LOGOUT
        </button>
      </div>
    </nav>
  )
}
