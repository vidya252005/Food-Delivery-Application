import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocation as useGeoLocation } from '../context/LocationContext';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const UserNavbar = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const { getCartCount } = useCart();
  const { location, detectLocation } = useGeoLocation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navClass = (path, extra = '') => {
    const active = path === '/select' ? pathname.startsWith('/select') : pathname === path;
    return `nav-link ${extra}${active ? ' active' : ''}`.trim();
  };

  return (
    <nav className="navbar user-navbar app-nav">
      <div className="nav-container">
        <Link to="/" className="nav-logo">FoodClub</Link>
        <button type="button" className="location-chip" onClick={detectLocation}>
          📍 {location?.label || 'Bengaluru'}
        </button>
        <ul className="nav-menu">
          <li className="nav-item"><Link to="/restaurants" className={navClass('/restaurants')}>Discover</Link></li>
          <li className="nav-item"><Link to="/select" className={navClass('/select', 'nav-link-select')}>Select</Link></li>
          {isLoggedIn && <li className="nav-item"><Link to="/preferences" className={navClass('/preferences')}>Preferences</Link></li>}
          {isLoggedIn && <li className="nav-item"><Link to="/orders" className={navClass('/orders')}>Orders</Link></li>}
          <li className="nav-item">
            <Link to="/cart" className={`${navClass('/cart')} cart-link`}>
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
              <li className="nav-item"><Link to="/signup" className="signup-btn">Sign up</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default UserNavbar;
