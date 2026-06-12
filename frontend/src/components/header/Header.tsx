import React from 'react';
import { NavLink } from 'react-router-dom';
import './Header.css';

export const Header = () => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">Nokia AC Labs</div>
      <ul className="navbar-links">
        <li>
          <NavLink 
            to="/" 
            className={({ isActive }) => (isActive ? 'active-link' : '')}
          >
            Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/kpi"
            className={({ isActive }) => (isActive ? 'active-link' : '')}
          >
            KPI Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'active-link' : '')}
          >
            Tichete
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/chat"
            className={({ isActive }) => (isActive ? 'active-link' : '')}
          >
            Asistent AI
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};