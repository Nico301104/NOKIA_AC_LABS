import axios from 'axios'

// Instanta Axios configurata cu URL-ul backend-ului si timeout de 10 secunde.
// VITE_API_URL poate fi setat in .env pentru alte medii (ex. productie).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor de REQUEST: adauga automat JWT-ul din localStorage la fiecare cerere.
// Astfel nu trebuie adaugat manual headerul Authorization in fiecare apel API.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor de RESPONSE: daca backend-ul returneaza 401 (token expirat sau invalid),
// sterge datele de autentificare din localStorage si redirecteaza la pagina de login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default api
