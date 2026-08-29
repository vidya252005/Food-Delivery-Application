import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRestaurant } from '../context/RestaurantContext';
import { loginPathWithRedirect, restaurantLoginPathWithRedirect } from '../utils/authRedirect';

export default function RoleRoute({ role, children }) {
  const location = useLocation();
  const returnPath = `${location.pathname}${location.search}`;

  const { isLoggedIn: userIn, role: userRole, loading: userLoading } = useAuth();
  const { isLoggedIn: restIn, loading: restLoading } = useRestaurant();

  if (userLoading || restLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (role === 'admin') {
    if (!userIn || userRole !== 'admin') {
      return <Navigate to="/admin" replace state={{ from: returnPath }} />;
    }
    return children;
  }

  if (role === 'user') {
    if (userIn && userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (!userIn || userRole !== 'user') {
      return <Navigate to={loginPathWithRedirect(returnPath)} replace />;
    }
    return children;
  }

  if (role === 'restaurant') {
    if (!restIn) {
      return <Navigate to={restaurantLoginPathWithRedirect(returnPath)} replace />;
    }
    return children;
  }

  return <Navigate to="/" replace />;
}
