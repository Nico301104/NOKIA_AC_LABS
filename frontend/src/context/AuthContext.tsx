import { createContext, useContext, useState, type ReactNode } from 'react'
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

// Contextul de autentificare — disponibil global in toata aplicatia prin useAuth().
const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // La initializare, incearca sa restaureze sesiunea din localStorage.
  // Astfel userul ramane autentificat dupa refresh de pagina.
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('auth_user')
    if (!stored) return null
    try {
      return JSON.parse(stored) as User
    } catch {
      // Daca datele salvate sunt corupte, le sterge si porneste cu sesiune goala.
      localStorage.removeItem('auth_user')
      return null
    }
  })

  const login = async (username: string, password: string): Promise<User> => {
    if (!username || !password) {
      throw new Error('Username și parolă obligatorii')
    }

    try {
      // Pasul 1: trimite credentialele la backend si primeste JWT-ul.
      const tokenRes = await api.post('/auth/login', { FullName: username, password })
      const { access_token } = tokenRes.data
      localStorage.setItem('auth_token', access_token)

      // Pasul 2: cu token-ul primit, cere datele userului autentificat (/auth/me).
      const meRes = await api.get('/auth/me')
      const loggedUser: User = {
        username: meRes.data.FullName,
        role: meRes.data.Role ?? 'user',
        team: meRes.data.Team,
      }

      // Salveaza datele userului in localStorage pentru persistenta la refresh.
      localStorage.setItem('auth_user', JSON.stringify(loggedUser))
      setUser(loggedUser)
      return loggedUser
    } catch (err: unknown) {
      // Curata token-ul daca autentificarea a esuat.
      localStorage.removeItem('auth_token')
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      throw new Error(detail ?? 'Autentificare eșuată')
    }
  }

  // Sterge toate datele de sesiune si reseteaza starea la null.
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

// Hook custom pentru a accesa contextul de autentificare.
// Arunca eroare daca e folosit in afara AuthProvider.
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth trebuie folosit în interiorul <AuthProvider>')
  return ctx
}
