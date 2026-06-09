import { Routes, Route } from 'react-router-dom';
import './App.css'
import { HomePage } from './pages/home/HomePage';
import { DashboardPage } from './pages/dashboard/DashBoardPage';

function App() {

  return (
      <Routes>
        {/* The "index" prop means this is the default component for this path */}
        <Route index element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Catch-all for 404s */}
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
  )
}

export default App
