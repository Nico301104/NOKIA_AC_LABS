import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('auth_user')
    if (!stored) return null
    try {
      return JSON.parse(stored)
    } catch {
      localStorage.removeItem('auth_user')
      return null
    }
  })

  // Placeholder login — fără backend deocamdată.
  // Când integrezi backendul, înlocuiești corpul cu un apel api.post('/auth/login', ...)
  const login = async (username, password) => {
    if (!username || !password) {
      throw new Error('Username și parolă obligatorii')
    }
    const mockUser = { username, role: 'engineer' }
    const mockToken = 'placeholder-token-' + Date.now()
    localStorage.setItem('auth_token', mockToken)
    localStorage.setItem('auth_user', JSON.stringify(mockUser))
    setUser(mockUser)
    return mockUser
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setUser(null)
  }

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth trebuie folosit în interiorul <AuthProvider>')
  return ctx
}
