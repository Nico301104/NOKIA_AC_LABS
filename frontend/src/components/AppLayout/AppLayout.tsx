import { Outlet, useLocation } from 'react-router-dom'
import AppNav from '../AppNav/AppNav'
import './AppLayout.css'

// Shell comun pentru paginile cu navigatie (Home / Tichete / KPI / Chat).
// Navbar-ul ramane fix; doar zona de continut se schimba si se animeaza.
export default function AppLayout() {
  const location = useLocation()

  return (
    <div className="app-shell">
      <AppNav />
      {/* key={pathname} => remontare la navigare => ruleaza animatia routeIn */}
      <div key={location.pathname} className="route-area">
        <Outlet />
      </div>
    </div>
  )
}
