import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { useCart } from '../context/CartContext';
import { foodclubAPI } from '../utils/api';
import { resolveRestaurantImage } from '../utils/foodImages';
import { formatPrice, formatDistance } from '../utils/format';
import { COMING_SOON_CITIES } from '../config/cities';
import FoodImage from '../components/FoodImage';
import HeroFoodCarousel from '../components/HeroFoodCarousel';
import './Landing.css';

const CATEGORIES = [
  'Salads & Bowls',
  'Plant-Based',
  'Organic',
  'Smoothies',
  'Protein Meals',
  'Superfoods',
];

export default function Landing() {
  const navigate = useNavigate();
  const { location, isSupported } = useLocation();
  const { getCartCount } = useCart();
  const [partners, setPartners] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Salads & Bowls');

  useEffect(() => {
    if (!isSupported || !location?.lat) return;
    const load = () => {
      foodclubAPI.getHomeFeed({ lat: location.lat, lng: location.lng, city: 'Bengaluru' })
        .then((feed) => setPartners(feed.nearbyRestaurants || feed.recommendedRestaurants || []))
        .catch(() => setPartners([]));
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(load);
    } else {
      setTimeout(load, 0);
    }
  }, [location, isSupported]);

  return (
    <div className="landing-page">
      <header className="landing-topnav">
        <Link to="/" className="landing-brand">
          <span className="landing-brand-mark" aria-hidden="true">🥗</span>
          FoodClub
        </Link>
        <nav className="landing-nav-links">
          <Link to="/">Home</Link>
          <Link to="/restaurants">Menu</Link>
          <Link to="/select">Service</Link>
          <Link to="/help">Contact</Link>
        </nav>
        <div className="landing-nav-actions">
          <Link to="/restaurants" className="landing-icon-btn" aria-label="Search">⌕</Link>
          <Link to="/cart" className="landing-icon-btn landing-cart" aria-label="Cart">
            🛒
            {getCartCount() > 0 && <span className="landing-cart-badge">{getCartCount()}</span>}
          </Link>
          <Link to="/login" className="landing-btn-outline">Login</Link>
          <Link to="/signup" className="landing-btn-solid">Register</Link>
        </div>
      </header>

      <section className="hero-ref">
        <div className="hero-ref-inner">
          <div className="hero-ref-copy">
            <h1>
              Order Your <span className="hero-highlight">Healthy</span> Foods
            </h1>
            <p className="hero-lead">
              Wherever you are, healthy meals are just a click away. Fresh, verified
              Bengaluru partners with full nutrition labels on every dish.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn-primary-hero" onClick={() => navigate('/restaurants')}>
                View Menu
              </button>
              <button type="button" className="btn-outline" onClick={() => navigate('/restaurants')}>
                Order Now
              </button>
            </div>
            <span className="hero-arrow-hint" aria-hidden="true">↪</span>
          </div>

          <div className="hero-ref-visual">
            <HeroFoodCarousel />
          </div>
        </div>

        <div className="hero-ref-footer">
          <div className="hero-ref-aside">
            <p>Enjoy our fast delivery service for your favourite healthy meal.</p>
            <button type="button" className="hero-learn-more" onClick={() => navigate('/select')}>
              Learn More
            </button>
          </div>
        </div>
      </section>

      <section className="explore-section">
        <h2>Browse by category</h2>
        <div className="category-pills">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`category-pill${activeCategory === c ? ' active' : ''}`}
              onClick={() => { setActiveCategory(c); navigate(`/restaurants?q=${encodeURIComponent(c)}`); }}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {partners.length > 0 && (
        <section className="partners-section">
          <h2>Curated partners in Bengaluru</h2>
          <p className="section-sub">24 verified healthy restaurants across every category</p>
          <div className="nearby-grid">
            {partners.slice(0, 8).map((r) => (
              <article
                key={r._id}
                className="nearby-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/restaurant/${r._id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/restaurant/${r._id}`)}
              >
                <FoodImage
                  src={resolveRestaurantImage(r)}
                  alt={r.name}
                  className="nearby-card-image"
                />
                <div className="nearby-card-body">
                  <div className="nearby-card-top">
                    <h3>{r.name}</h3>
                    <span className="rating">⭐ {r.rating}</span>
                  </div>
                  <p className="partner-tags">{r.cuisine?.join(' · ')}</p>
                  <div className="nearby-meta">
                    {r.distanceKm != null && <span>{formatDistance(r.distanceKm)}</span>}
                    <span>{r.etaLabel || r.deliveryTime}</span>
                    {r.minOrder > 0 && <span>Min {formatPrice(r.minOrder)}</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="section-cta">
            <button type="button" className="btn-outline" onClick={() => navigate('/restaurants')}>
              View all 24 partners
            </button>
          </div>
        </section>
      )}

      <section className="coming-soon-section">
        <p className="area-section-label">Expanding soon</p>
        <div className="area-chips">
          {COMING_SOON_CITIES.map((c) => (
            <span key={c.label} className="area-chip coming-soon">{c.label} — coming soon</span>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <p>FoodClub — Bengaluru&apos;s curated marketplace for pure, healthy restaurant delivery</p>
        <div className="footer-links">
          <Link to="/help">Help</Link>
          <Link to="/restaurant-signup">Partner with us</Link>
          <Link to="/select">FoodClub Select</Link>
        </div>
      </footer>
    </div>
  );
}
