import { createContext, useContext, useState, ReactNode } from 'react'

interface User {
  username: string
  role: string
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

  // Placeholder login — fără backend deocamdată.
  // Când integrezi backendul, înlocuiești corpul cu un apel api.post('/auth/login', ...)
  const login = async (username: string, password: string): Promise<User> => {
    if (!username || !password) {
      throw new Error('Username și parolă obligatorii')
    }
    const mockUser: User = { username, role: 'engineer' }
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
