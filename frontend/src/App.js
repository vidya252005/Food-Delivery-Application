import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { LocationProvider } from './context/LocationContext';
import { SocketProvider } from './context/SocketContext';
import UserNavbar from './components/UserNavbar';
import RestaurantNavbar from './components/RestaurantNavbar';
import Landing from './pages/Landing';
import Restaurants from './pages/Restaurants';
import RestaurantDetail from './pages/RestaurantDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import RestaurantDashboard from './pages/RestaurantDashboard';
import RestaurantMenu from './pages/RestaurantMenu';
import RestaurantOrders from './pages/RestaurantOrders';
import RestaurantProfile from './pages/RestaurantProfile';
import Orders from './pages/Orders';
import OrderTracking from './pages/OrderTracking';
import Payment from './pages/Payment';
import Feedback from './pages/Feedback';
import RoleRoute from './routes/RoleRoute';
import './App.css';
import SelectMembership from './pages/Select';
import Preferences from './pages/Preferences';
import AdminDashboard from './pages/Admin';
import RestaurantVerification from './pages/RestaurantVerification';
import Help from './pages/Help';

import { GOOGLE_CLIENT_ID, isGoogleOAuthConfigured } from './config/google';

function NavbarSwitcher() {
  const path = useLocation().pathname;
  const { role: userRole, isLoggedIn: userLoggedIn } = useAuth();
  const { isLoggedIn: restaurantLoggedIn } = useRestaurant();

  if (path === '/login' || path === '/signup' ||
      path === '/restaurant-login' || path === '/restaurant-signup' || path === '/admin') return null;

  if (restaurantLoggedIn) return <RestaurantNavbar />;
  if (userLoggedIn && userRole === 'user') return <UserNavbar />;

  const isRestaurantPortal = ['/restaurant/dashboard', '/restaurant/menu', '/restaurant/orders', '/restaurant/profile']
    .some((p) => path.startsWith(p));
  if (isRestaurantPortal) return <RestaurantNavbar />;
  return <UserNavbar />;
}

function AppRoutes() {
  return (
    <Router>
      <AuthProvider>
        <RestaurantProvider>
          <LocationProvider>
            <SocketProvider>
              <CartProvider>
                <div className="App">
                  <NavbarSwitcher />
                  <Routes>
                    <Route path="/" element={<Navigate to="/restaurants" replace />} />
                    <Route path="/home" element={<Landing />} />
                    <Route path="/restaurants" element={<Restaurants />} />
                    <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/restaurant-login" element={<RestaurantLogin />} />
                    <Route path="/restaurant-signup" element={<RestaurantSignup />} />
                    <Route path="/restaurant/dashboard" element={<RoleRoute role="restaurant"><RestaurantDashboard /></RoleRoute>} />
                    <Route path="/restaurant/menu" element={<RoleRoute role="restaurant"><RestaurantMenu /></RoleRoute>} />
                    <Route path="/restaurant/orders" element={<RoleRoute role="restaurant"><RestaurantOrders /></RoleRoute>} />
                    <Route path="/restaurant/profile" element={<RoleRoute role="restaurant"><RestaurantProfile /></RoleRoute>} />
                    <Route path="/restaurant/verification" element={<RoleRoute role="restaurant"><RestaurantVerification /></RoleRoute>} />
                    <Route path="/orders" element={<RoleRoute role="user"><Orders /></RoleRoute>} />
                    <Route path="/orders/:orderId/track" element={<RoleRoute role="user"><OrderTracking /></RoleRoute>} />
                    <Route path="/payment" element={<Payment />} />
                    <Route path="/feedback" element={<Feedback />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/help" element={<Help />} />
                    <Route path="/select" element={<SelectMembership />} />
                    <Route path="/preferences" element={<RoleRoute role="user"><Preferences /></RoleRoute>} />
                  </Routes>
                </div>
              </CartProvider>
            </SocketProvider>
          </LocationProvider>
        </RestaurantProvider>
      </AuthProvider>
    </Router>
  );
}

function App() {
  if (isGoogleOAuthConfigured()) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AppRoutes />
      </GoogleOAuthProvider>
    );
  }
  return <AppRoutes />;
}

export default App;
