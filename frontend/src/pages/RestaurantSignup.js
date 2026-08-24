import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { authAPI } from '../utils/api';
import './RestaurantSignup.css';

function RestaurantSignup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    cuisine: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { RestaurantLogin } = useRestaurant();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Split cuisine by comma
      const cuisineArray = formData.cuisine
        .split(',')
        .map(c => c.trim())
        .filter(c => c);

      const restaurantData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        cuisine: cuisineArray,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
      };

      console.log('Registering restaurant:', restaurantData);
      const response = await authAPI.restaurantRegister(restaurantData);
      console.log('Restaurant registration response:', response);
      
      // Automatically login after registration
      RestaurantLogin(response.data.restaurant, response.token);
      
      alert('Registration successful! Welcome to FoodClub!');
      navigate('/restaurant/dashboard');
    } catch (err) {
      console.error('Restaurant registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card restaurant-auth">
          <div className="restaurant-badge">🏪 Restaurant</div>
          <h2>Register Your Restaurant</h2>
          <p className="auth-subtitle">Join our platform and start receiving orders!</p>
          
          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Restaurant Name *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Pizza Palace"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="restaurant@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(123) 456-7890"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cuisine">Cuisine Types *</label>
                <input
                  id="cuisine"
                  type="text"
                  name="cuisine"
                  value={formData.cuisine}
                  onChange={handleChange}
                  placeholder="e.g., Italian, Pizza, Pasta"
                  required
                />
                <small>Separate multiple cuisines with commas</small>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="street">Street Address *</label>
              <input
                id="street"
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="123 Main Street"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="New York"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="state">State *</label>
                <input
                  id="state"
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="NY"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="zipCode">Zip Code *</label>
                <input
                  id="zipCode"
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder="10001"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="auth-button restaurant-button"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register Restaurant'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have a restaurant account?{' '}
              <Link to="/restaurant-login" className="auth-link">Login</Link>
            </p>
            <p>
              Are you a customer?{' '}
              <Link to="/signup" className="auth-link">Customer Signup</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestaurantSignup;