import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { foodclubAPI } from '../utils/api';
import { COMING_SOON_CITIES } from '../config/cities';
import HeroFoodCarousel from '../components/HeroFoodCarousel';
import RestaurantCard from '../components/RestaurantCard';
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
  const [partners, setPartners] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Salads & Bowls');

  useEffect(() => {
    if (!isSupported || !location?.lat) return;
    foodclubAPI
      .getHomeFeed({ lat: location.lat, lng: location.lng, city: 'Bengaluru' })
      .then((feed) => setPartners(feed.nearbyRestaurants || feed.recommendedRestaurants || []))
      .catch(() => setPartners([]));
  }, [location, isSupported]);

  return (
    <div className="landing-page app-page">
      {/* ── Hero Section ── */}
      <section className="landing-hero">
        <p className="landing-eyebrow">DISCOVER · QUALITY · NUTRITION</p>
        <h1 className="landing-title">
          Order Your <span className="landing-title-accent">Favorite</span> Foods
        </h1>
        <p className="landing-lead">
          Enjoy fresh, delicious meals delivered to you in minutes, all through our
          easy-to-use website. Fresh, verified Bengaluru partners.
        </p>

        <div className="landing-hero-actions">
          <button
            type="button"
            className="landing-btn-primary"
            onClick={() => navigate('/restaurants')}
          >
            View Menu
          </button>
          <button
            type="button"
            className="landing-btn-secondary"
            onClick={() => navigate('/restaurants')}
          >
            Order Now
          </button>
        </div>

        {/* ── Carousel Stage with Hand-Drawn Arrow Decor ── */}
        <div className="landing-hero-center-stage">
          <svg
            className="landing-spiral-arrow"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              d="M30 65 C 20 60, 20 45, 35 45 C 50 45, 50 65, 30 75 C 15 80, 5 60, 25 35 C 45 10, 75 25, 80 5"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M70 5 L80 5 L80 15"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <HeroFoodCarousel />
        </div>

        {/* ── Bottom Hero Stats & Delivery Teaser ── */}
        <div className="landing-hero-bottom-bar">
          <div className="landing-hero-reviews">
            <span className="hero-rating-score">
              4.9/5 <span className="hero-rating-star">★</span>
            </span>
            <span className="hero-review-count">1000+</span>
            <span className="hero-review-label">Review</span>
            <div className="hero-avatar-row">
              <div className="hero-avatar-stack">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60" alt="" />
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60" alt="" />
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=60" alt="" />
              </div>
              <button
                type="button"
                className="hero-arrow-bubble"
                onClick={() => navigate('/restaurants')}
                aria-label="Explore restaurants"
              >
                ↗
              </button>
            </div>
          </div>

          <div className="landing-hero-delivery-callout">
            <p className="delivery-callout-text">
              Enjoy our fast delivery service for your favourite meal.
            </p>
            <button
              type="button"
              className="landing-link-btn"
              onClick={() => navigate('/select')}
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* ── Category Pills ── */}
      <section className="landing-section">
        <h2 className="landing-section-title">Browse by category</h2>
        <div className="landing-category-pills">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`landing-category-pill${activeCategory === c ? ' active' : ''}`}
              onClick={() => {
                setActiveCategory(c);
                navigate(`/restaurants?q=${encodeURIComponent(c)}`);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* ── Curated Partners Grid ── */}
      {partners.length > 0 && (
        <section className="landing-section">
          <h2 className="landing-section-title">Curated partners in Bengaluru</h2>
          <p className="landing-section-sub">Verified healthy restaurants across every category</p>
          <div className="landing-partner-grid">
            {partners.slice(0, 6).map((r) => (
              <RestaurantCard key={r._id} restaurant={r} />
            ))}
          </div>
          <div className="landing-section-cta">
            <button
              type="button"
              className="landing-btn-secondary"
              onClick={() => navigate('/restaurants')}
            >
              View all partners
            </button>
          </div>
        </section>
      )}

      {/* ── Coming Soon Cities ── */}
      <section className="landing-section landing-coming-soon">
        <p className="landing-eyebrow">EXPANDING SOON</p>
        <div className="landing-area-chips">
          {COMING_SOON_CITIES.map((c) => (
            <span key={c.label} className="landing-area-chip">{c.label}</span>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <p>FoodClub — Bengaluru&apos;s curated marketplace for pure, healthy restaurant delivery</p>
        <div className="landing-footer-links">
          <Link to="/help">Help</Link>
          <Link to="/restaurant-signup">Partner with us</Link>
          <Link to="/select">FoodClub Select</Link>
        </div>
      </footer>
    </div>
  );
}