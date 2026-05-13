import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', padding: '3rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem' }}>
          Dashboard<span style={{ color: 'var(--signal-400)' }}>.</span>
        </h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.6rem 1.2rem',
            border: '1px solid var(--graphite-700)',
            borderRadius: 10,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            letterSpacing: '0.1em'
          }}
        >
          LOGOUT
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)' }}>
        Salut, <strong>{user?.username}</strong>. Placeholder dashboard — se completează în M5+.
      </p>
    </div>
  )
}
