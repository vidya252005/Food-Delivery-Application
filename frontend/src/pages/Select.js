import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { foodclubAPI } from '../utils/api';
import { formatPrice } from '../utils/format';
import RestaurantCard from '../components/RestaurantCard';
import ComingSoon from '../components/ComingSoon';
import './Select.css';

const BENEFIT_ICONS = ['🚚', '✦', '💰', '⚡'];
const SELECT_PRICE = 99;

export default function SelectMembership() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const { location, isSupported, saveLocation } = useLocation();
  const [membership, setMembership] = useState(null);
  const [benefits, setBenefits] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });
  const [upiId, setUpiId] = useState('');

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

  const handleCardChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'cardNumber') {
      value = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19);
    } else if (e.target.name === 'expiryDate') {
      value = value.replace(/\D/g, '');
      if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2, 4);
    } else if (e.target.name === 'cvv') {
      value = value.replace(/\D/g, '').slice(0, 3);
    }
    setCardDetails({ ...cardDetails, [e.target.name]: value });
  };

  const validatePayment = () => {
    if (paymentMethod === 'card') {
      const cardNum = cardDetails.cardNumber.replace(/\s/g, '');
      if (cardNum.length !== 16) {
        setError('Card number must be 16 digits');
        return false;
      }
      if (!cardDetails.cardName) {
        setError('Cardholder name is required');
        return false;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardDetails.expiryDate)) {
        setError('Expiry date must be in MM/YY format');
        return false;
      }
      if (cardDetails.cvv.length !== 3) {
        setError('CVV must be 3 digits');
        return false;
      }
    }
    if (paymentMethod === 'upi') {
      if (!upiId || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID');
        return false;
      }
    }
    return true;
  };

  const openSubscribe = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setError('');
    setShowPayment(true);
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setError('');
    if (!validatePayment()) return;

    try {
      setActionLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const userId = user?.id || user?._id || 'user';
      const idempotencyKey = `select_${userId}_${Date.now()}`;
      const payment = {
        method: paymentMethod,
        idempotencyKey,
        ...(paymentMethod === 'upi' ? { upiId } : {}),
        ...(paymentMethod === 'card'
          ? { cardNumber: cardDetails.cardNumber.replace(/\s/g, '') }
          : {}),
      };

      const mem = await foodclubAPI.subscribe(payment);
      setMembership(mem);
      setShowPayment(false);
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
      {error && !showPayment && <p className="error-banner">{error}</p>}

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
            <button type="button" className="select-cta" onClick={openSubscribe} disabled={actionLoading}>
              Join Select — <span className="select-price-amount">{formatPrice(SELECT_PRICE)}</span>/month
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

      {showPayment && (
        <div className="select-payment-overlay" role="dialog" aria-modal="true">
          <div className="select-payment-modal">
            <h2>Subscribe to Select</h2>
            <p className="select-payment-amount">{formatPrice(SELECT_PRICE)}/month</p>
            {error && <p className="error-banner">{error}</p>}

            <form onSubmit={handleSubscribe}>
              <div className="select-payment-methods">
                <label>
                  <input
                    type="radio"
                    name="method"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                  />
                  Card
                </label>
                <label>
                  <input
                    type="radio"
                    name="method"
                    value="upi"
                    checked={paymentMethod === 'upi'}
                    onChange={() => setPaymentMethod('upi')}
                  />
                  UPI
                </label>
              </div>

              {paymentMethod === 'card' ? (
                <div className="select-payment-fields">
                  <input
                    type="text"
                    name="cardNumber"
                    placeholder="Card number"
                    value={cardDetails.cardNumber}
                    onChange={handleCardChange}
                    required
                  />
                  <input
                    type="text"
                    name="cardName"
                    placeholder="Name on card"
                    value={cardDetails.cardName}
                    onChange={handleCardChange}
                    required
                  />
                  <div className="select-payment-row">
                    <input
                      type="text"
                      name="expiryDate"
                      placeholder="MM/YY"
                      value={cardDetails.expiryDate}
                      onChange={handleCardChange}
                      required
                    />
                    <input
                      type="text"
                      name="cvv"
                      placeholder="CVV"
                      value={cardDetails.cvv}
                      onChange={handleCardChange}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="select-payment-fields">
                  <input
                    type="text"
                    placeholder="UPI ID (e.g. name@upi)"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="select-payment-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPayment(false)} disabled={actionLoading}>
                  Cancel
                </button>
                <button type="submit" className="select-cta" disabled={actionLoading}>
                  {actionLoading ? 'Processing…' : `Pay ${formatPrice(SELECT_PRICE)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
