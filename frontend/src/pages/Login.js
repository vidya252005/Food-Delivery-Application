import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { isGoogleOAuthConfigured, GOOGLE_OAUTH_ORIGIN_HINT } from '../config/google';
import { getPostAuthPath } from '../utils/authRedirect';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = getPostAuthPath(location);
  const googleEnabled = isGoogleOAuthConfigured();
  const fromCart = redirectTo === '/cart';

  const goAfterAuth = () => navigate(redirectTo, { replace: true });

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');

    if (!credentialResponse?.credential) {
      setError('Google did not return a sign-in credential. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.googleLogin(credentialResponse.credential);
      login(response.data.user, response.token);
      goAfterAuth();
    } catch (err) {
      const msg = err.message || 'Google login failed';
      setError(msg.includes('Client ID') || msg.includes('503')
        ? `${msg}. ${GOOGLE_OAUTH_ORIGIN_HINT}`
        : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.userLogin({ email, password });
      login(response.data.user, response.token);
      goAfterAuth();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h2>Login to FoodClub</h2>
          <p className="auth-subtitle">
            {fromCart
              ? 'Sign in to complete your order — your cart is saved.'
              : 'Bengaluru\'s curated marketplace for pure, healthy food'}
          </p>

          {error && (
            <div className="error-message"><span>⚠️ {error}</span></div>
          )}

          <div className="oauth-section">
            {googleEnabled ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in was cancelled or failed')}
                theme="outline"
                size="large"
                text="continue_with"
                width="100%"
              />
            ) : (
              <div className="info-message oauth-unconfigured">
                Google Sign-In is not configured. Copy <code>frontend/.env.example</code> to{' '}
                <code>frontend/.env</code>, set <code>REACT_APP_GOOGLE_CLIENT_ID</code>, set the
                same value as <code>GOOGLE_CLIENT_ID</code> in <code>backend/.env</code>, then
                restart both servers.
              </div>
            )}
          </div>

          <div className="auth-divider"><span>or</span></div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="emma@example.com" required autoComplete="email" />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="password123" required autoComplete="current-password" minLength={6} />
            </div>
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Login with Email'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account?{' '}
              <Link
                to={{ pathname: '/signup', search: location.search }}
                state={location.state}
                className="auth-link"
              >
                Sign Up
              </Link>
            </p>
            <p>Restaurant owner? <Link to="/restaurant-login" className="auth-link">Restaurant Login</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
