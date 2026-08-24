import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { foodclubAPI } from '../utils/api';
import RestaurantCard from '../components/RestaurantCard';
import ComingSoon from '../components/ComingSoon';
import './Select.css';

const BENEFIT_ICONS = ['🚚', '✦', '💰', '⚡'];

export default function SelectMembership() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const { location, isSupported, saveLocation } = useLocation();
  const [membership, setMembership] = useState(null);
  const [benefits, setBenefits] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [location, isLoggedIn]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [benefitsRes, restRes] = await Promise.all([
        foodclubAPI.getBenefits(),
        location?.lat
          ? foodclubAPI.getSelectRestaurants(location.lat, location.lng)
          : foodclubAPI.discover({ selectOnly: true }),
      ]);
      setBenefits(benefitsRes.benefits || benefitsRes);
      setRestaurants(restRes);

      if (isLoggedIn) {
        const mem = await foodclubAPI.getMembership();
        setMembership(mem);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    try {
      setActionLoading(true);
      const mem = await foodclubAPI.subscribe();
      setMembership(mem);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      const mem = await foodclubAPI.cancelMembership();
      setMembership(mem);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isActive = membership?.tier === 'select' && membership?.active;

  if (loading) {
    return <div className="loading-container"><div className="loading">Loading FoodClub Select…</div></div>;
  }

  if (!isSupported) {
    return <ComingSoon cityLabel={location?.label} onSelectBengaluru={saveLocation} />;
  }

  return (
    <div className="select-page">
      {error && <p className="error-banner">{error}</p>}

      <div className="select-split">
        <aside className="select-panel-left">
          <span className="select-crown" aria-hidden="true">👑</span>
          <p className="select-eyebrow">PREMIUM MEMBERSHIP</p>
          <h1 className="select-title">FoodClub Select</h1>
          <p className="select-subtitle">
            Exclusive access to verified, quality-scored partners — free delivery and member savings on every order.
          </p>

          {isActive ? (
            <div className="select-status active">
              <span className="select-member-badge">✦ You&apos;re a Select member</span>
              {membership.expiryDate && (
                <small>Renews {new Date(membership.expiryDate).toLocaleDateString()}</small>
              )}
              <button type="button" className="btn-secondary select-cancel-btn" onClick={handleCancel} disabled={actionLoading}>
                Cancel membership
              </button>
            </div>
          ) : (
            <button type="button" className="select-cta" onClick={handleSubscribe} disabled={actionLoading}>
              Join Select — <span className="select-price-amount">₹99</span>/month
            </button>
          )}

          <ul className="select-trust">
            <li><span className="select-trust-icon">✦</span> Cancel anytime</li>
            <li><span className="select-trust-icon">✦</span> Exclusive savings</li>
          </ul>

          <div className="select-social">
            <p className="select-social-label">Loved by members</p>
            <div className="select-social-row">
              <span className="select-social-rating"><span className="select-star">★</span> 4.7/5</span>
              <div className="select-avatars" aria-hidden="true">
                <span className="select-avatar">P</span>
                <span className="select-avatar">A</span>
                <span className="select-avatar">R</span>
                <span className="select-avatar">M</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="select-panel-right">
          <h2 className="select-benefits-heading">Member benefits</h2>
          <ul className="select-benefits-list">
            {benefits.map((b, i) => (
              <li key={b.id || b.title}>
                <span className="select-benefit-icon">{BENEFIT_ICONS[i % BENEFIT_ICONS.length]}</span>
                <div>
                  <strong>{b.title}</strong>
                  <p>{b.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {restaurants.length > 0 && (
        <section className="select-restaurants">
          <h2 className="select-section-title">Select partner restaurants</h2>
          <p className="select-section-sub">Verified partners scoring 90+ on FoodClub Quality</p>
          <div className="select-grid">
            {restaurants.map((r) => (
              <RestaurantCard key={r._id || r.id} restaurant={r} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
