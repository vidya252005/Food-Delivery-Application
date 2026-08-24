import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import './Navbar.css';

const RestaurantNavbar = () => {
  const { restaurant, logout } = useRestaurant();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navClass = (path) => `nav-link${pathname.startsWith(path) ? ' active' : ''}`;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar restaurant-navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/restaurant/dashboard" className="nav-logo restaurant-logo">
            FoodClub Partner
          </Link>
        </div>

        <nav className="nav-menu" aria-label="Restaurant">
          <Link to="/restaurant/dashboard" className={navClass('/restaurant/dashboard')}>Dashboard</Link>
          <Link to="/restaurant/menu" className={navClass('/restaurant/menu')}>Menu</Link>
          <Link to="/restaurant/orders" className={navClass('/restaurant/orders')}>Orders</Link>
          <Link to="/restaurant/verification" className={navClass('/restaurant/verification')}>Verification</Link>
          <Link to="/restaurant/profile" className={navClass('/restaurant/profile')}>Profile</Link>
          {restaurant && (
            <>
              <span className="restaurant-name">{restaurant.name}</span>
              <button type="button" className="nav-btn logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default RestaurantNavbar;
