import { createContext, useContext, useState, ReactNode } from 'react'
import api from '../services/api'

interface User {
  username: string
  role: string
  team: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('auth_user')
    if (!stored) return null
    try {
      return JSON.parse(stored) as User
    } catch {
      localStorage.removeItem('auth_user')
      return null
    }
  })

  const login = async (username: string, password: string): Promise<User> => {
    if (!username || !password) {
      throw new Error('Username și parolă obligatorii')
    }

    try {
      const tokenRes = await api.post('/auth/login', { FullName: username, password })
      const { access_token } = tokenRes.data
      localStorage.setItem('auth_token', access_token)

      const meRes = await api.get('/auth/me')
      const loggedUser: User = {
        username: meRes.data.FullName,
        role: meRes.data.Role ?? 'user',
        team: meRes.data.Team,
      }
      localStorage.setItem('auth_user', JSON.stringify(loggedUser))
      setUser(loggedUser)
      return loggedUser
    } catch (err: unknown) {
      localStorage.removeItem('auth_token')
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      throw new Error(detail ?? 'Autentificare eșuată')
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth trebuie folosit în interiorul <AuthProvider>')
  return ctx
}
