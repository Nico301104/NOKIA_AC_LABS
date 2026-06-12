import { useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../pages/Dashboard.css'

// Bara de navigatie afisata pe pagina protejata.
// Arata numele si echipa userului autentificat si butonul de logout.
export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    // Sterge sesiunea din context si localStorage, apoi trimite la login.
    logout()
    navigate('/login')
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

      {/* Linkuri catre celelalte module ale aplicatiei */}
      <div className="db-nav-links">
        <NavLink to="/dashboard" className={({ isActive }) => `db-nav-link${isActive ? ' active' : ''}`}>
          TICHETE
        </NavLink>
        <NavLink to="/kpi" className={({ isActive }) => `db-nav-link${isActive ? ' active' : ''}`}>
          KPI DASHBOARD
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => `db-nav-link${isActive ? ' active' : ''}`}>
          ASISTENT AI
        </NavLink>
      </div>

      <div className="db-nav-right">
        {/* Afiseaza numele si echipa userului curent */}
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
