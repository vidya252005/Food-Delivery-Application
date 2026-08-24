import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../context/LocationContext';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const UserNavbar = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const { getCartCount } = useCart();
  const { location, detectLocation } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="navbar user-navbar app-nav">
      <div className="nav-container">
        <Link to="/" className="nav-logo">FoodClub</Link>
        <button type="button" className="location-chip" onClick={detectLocation}>
          📍 {location?.label || 'Bengaluru'}
        </button>
        <ul className="nav-menu">
          <li className="nav-item"><Link to="/restaurants" className="nav-link">Discover</Link></li>
          <li className="nav-item"><Link to="/select" className="nav-link">Select</Link></li>
          {isLoggedIn && <li className="nav-item"><Link to="/preferences" className="nav-link">Preferences</Link></li>}
          {isLoggedIn && <li className="nav-item"><Link to="/orders" className="nav-link">Orders</Link></li>}
          <li className="nav-item">
            <Link to="/cart" className="nav-link cart-link">
              Cart {getCartCount() > 0 && <span className="cart-badge">{getCartCount()}</span>}
            </Link>
          </li>
          <li className="nav-item"><NotificationBell /></li>
          {isLoggedIn ? (
            <>
              <li className="nav-item"><span className="nav-link">Hi, {user?.name?.split(' ')[0]}</span></li>
              <li className="nav-item">
                <button type="button" className="nav-btn logout-btn" onClick={() => { logout(); navigate('/'); }}>Logout</button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item"><Link to="/login" className="nav-link">Login</Link></li>
              <li className="nav-item"><Link to="/signup" className="nav-btn signup-btn">Sign up</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default UserNavbar;
