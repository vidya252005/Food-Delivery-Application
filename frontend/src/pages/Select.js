import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { foodclubAPI } from '../utils/api';
import QualityBadges from '../components/QualityBadges';
import FoodImage from '../components/FoodImage';
import { resolveRestaurantImage } from '../utils/foodImages';
import { formatDistance } from '../utils/format';
import ComingSoon from '../components/ComingSoon';
import './Select.css';

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
      <header className="select-hero">
        <p className="select-eyebrow">Premium membership</p>
        <h1>FoodClub Select</h1>
        <p className="select-subtitle">
          Exclusive access to verified, quality-scored partners — free delivery and member savings on every order.
        </p>
        {isActive ? (
          <div className="select-status active">
            <span>✦ You're a Select member</span>
            {membership.expiryDate && (
              <small>Renews {new Date(membership.expiryDate).toLocaleDateString()}</small>
            )}
            <button type="button" className="btn-secondary" onClick={handleCancel} disabled={actionLoading}>
              Cancel membership
            </button>
          </div>
        ) : (
          <button type="button" className="btn-primary select-cta" onClick={handleSubscribe} disabled={actionLoading}>
            Join Select — ₹99/month
          </button>
        )}
      </header>

      {error && <p className="error-banner">{error}</p>}

      <section className="select-benefits">
        <h2>Member benefits</h2>
        <ul>
          {benefits.map((b) => (
            <li key={b.id}>
              <strong>{b.title}</strong>
              <span>{b.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="select-restaurants">
        <h2>Select partner restaurants</h2>
        <p>Verified partners scoring 90+ on FoodClub Quality</p>
        <div className="select-grid">
          {restaurants.map((r) => (
            <Link key={r.id} to={`/restaurant/${r.id}`} className="select-card">
              <FoodImage src={resolveRestaurantImage(r)} alt={r.name} className="select-card-img" />
              <div className="select-card-body">
                <h3>{r.name}</h3>
                <QualityBadges restaurant={r} compact />
                {r.distanceKm != null && (
                  <span className="select-distance">{formatDistance(r.distanceKm)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
