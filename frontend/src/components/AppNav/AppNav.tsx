import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './AppNav.css'

// Bara de navigatie unica, folosita pe toate paginile (Home / KPI / Tichete / Chat).
// Inlocuieste cele 3 navbar-uri diferite de dinainte, ca trecerea intre pagini
// sa fie consistenta vizual. Partea dreapta se adapteaza dupa starea de auth.
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `app-nav-link${isActive ? ' active' : ''}`

export default function AppNav() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="app-nav">
      <button className="app-nav-brand" onClick={() => navigate('/dashboard')} aria-label="Dashboard">
        <span className="app-nav-logo">
          <svg viewBox="0 0 40 40" fill="none">
            <path d="M8 20 L14 14 L20 20 L26 14 L32 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="20" cy="28" r="2" fill="currentColor" />
          </svg>
        </span>
        <span className="app-nav-titles">
          <span className="app-nav-title">NOKIA</span>
        </span>
      </button>

      <div className="app-nav-links">
        <NavLink to="/dashboard" className={navLinkClass}>DASHBOARD</NavLink>
        <NavLink to="/kpi" className={navLinkClass}>KPI</NavLink>
        <NavLink to="/chat" className={navLinkClass}>ASISTENT AI</NavLink>
      </div>

      <div className="app-nav-right">
        {isAuthenticated ? (
          <>
            <div className="app-nav-user">
              <span className="app-nav-username">{user?.username}</span>
              <span className="app-nav-role">{user?.team?.toUpperCase()}</span>
            </div>
            <div className="app-nav-sep" />
            <button className="app-nav-btn" onClick={handleLogout}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              LOGOUT
            </button>
          </>
        ) : (
          <NavLink to="/login" className="app-nav-btn app-nav-btn--login">
            LOGIN
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </NavLink>
        )}
      </div>
    </nav>
  )
}
