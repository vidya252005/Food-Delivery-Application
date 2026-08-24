import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { authAPI } from '../utils/api';
import './RestaurantLogin.css';

function RestaurantLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isLoggedIn } = useRestaurant();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn && window.location.pathname === '/restaurant-login') {
      navigate('/restaurant/dashboard');
    }
  }, [isLoggedIn, navigate]);
  
  

  if (isLoggedIn) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.restaurantLogin({ email, password });
      const token = data.token ?? data.data?.token;
      const restaurant = data.data?.restaurant ?? data.restaurant;
      if (!restaurant || !token) throw new Error('Invalid response from server');
      login(restaurant, token);
      
      alert('Login successful!');
      navigate('/restaurant/dashboard', { replace: true });
    } catch (err) {
      console.error('Restaurant login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card restaurant-auth">
          <div className="restaurant-badge">🏪 Restaurant</div>
          <h2>Restaurant Login</h2>
          <p className="auth-subtitle">Manage your restaurant and orders</p>

          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Restaurant Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter restaurant email"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="auth-button restaurant-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Login to Dashboard'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have a restaurant account?{' '}
              <Link to="/restaurant-signup" className="auth-link">Register Restaurant</Link>
            </p>
            <p>
              Are you a customer?{' '}
              <Link to="/login" className="auth-link">Customer Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestaurantLogin;
