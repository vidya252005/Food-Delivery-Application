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
  const { location, detectLocation, loading: locating } = useGeoLocation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navClass = (path, extra = '') => {
    const active = path === '/select' ? pathname.startsWith('/select') : pathname === path;
    return `nav-link ${extra}${active ? ' active' : ''}`.trim();
  };

  return (
    <header className="navbar user-navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/restaurants" className="nav-logo">FoodClub</Link>
          <button
            type="button"
            className="location-chip"
            onClick={detectLocation}
            disabled={locating}
            title={location?.label || 'Bengaluru'}
          >
            📍 {locating ? 'Locating…' : (location?.label || 'Bengaluru')}
          </button>
        </div>

        <nav className="nav-menu" aria-label="Main">
          <Link to="/restaurants" className={navClass('/restaurants')}>Discover</Link>
          <Link to="/select" className={navClass('/select', 'nav-link-select')}>Select</Link>
          {isLoggedIn && <Link to="/preferences" className={navClass('/preferences')}>Preferences</Link>}
          {isLoggedIn && <Link to="/orders" className={navClass('/orders')}>Orders</Link>}
          <Link to="/cart" className={`${navClass('/cart')} cart-link`}>
            Cart
            {getCartCount() > 0 && <span className="cart-badge">{getCartCount()}</span>}
          </Link>
          <NotificationBell />
          {isLoggedIn ? (
            <>
              <span className="nav-greeting">Hi, {user?.name?.split(' ')[0]}</span>
              <button
                type="button"
                className="nav-btn logout-btn"
                onClick={() => { logout(); navigate('/'); }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="signup-btn">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default UserNavbar;
