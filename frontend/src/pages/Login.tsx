import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autentificare eșuată')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="orb orb-violet" />
      <div className="orb orb-green" />

      <div className="login-container">
        <div className="brand">
          <div className="brand-logo">
            <svg viewBox="0 0 40 40" fill="none">
              <path d="M8 20 L14 14 L20 20 L26 14 L32 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="20" cy="28" r="2" fill="currentColor"/>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">NOKIA</span>
            <span className="brand-sub">TICKET FILTER</span>
          </div>
        </div>

        <div className="login-card">
          <div className="card-glow" />
          <div className="card-inner">
            <div className="card-header">
              <span className="status-dot" />
              <span className="card-eyebrow">SECURE ACCESS</span>
            </div>

            <h1 className="card-title">
              Bun venit<span className="accent">.</span>
            </h1>
            <p className="card-subtitle">
              Autentifică-te pentru a accesa sistemul de filtrare a tichetelor.
            </p>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="field">
                <label htmlFor="username">USERNAME</label>
                <div className="input-wrap">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ion.popescu"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="password">PAROLĂ</label>
                <div className="input-wrap">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button type="submit" className="btn-primary" disabled={loading}>
                <span className="btn-label">
                  {loading ? 'Se conectează…' : 'Autentificare'}
                </span>
                <svg className="btn-arrow" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10 L16 10 M11 5 L16 10 L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <p className="placeholder-note">
                <span className="note-tag">PLACEHOLDER</span>
                Conectarea reală va folosi API-ul C# (M5+). Acum orice user/parolă funcționează.
              </p>
            </form>
          </div>
        </div>

        <div className="footer-mini">
          <span>v0.1.0</span>
          <span className="dot">·</span>
          <span>M4 · React + Vite + Axios + Router</span>
        </div>
      </div>
    </div>
  )
}
