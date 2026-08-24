import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HERO_DISH_IMAGES } from '../utils/foodImages';
import { formatPrice } from '../utils/format';
import FoodImage from './FoodImage';
import './HeroFoodCarousel.css';

export const HERO_FOODS = [
  {
    id: 'protein-bowl',
    name: 'Protein Power Bowl',
    partner: 'EatFit',
    price: 349,
    image: HERO_DISH_IMAGES.proteinBowl,
    query: 'Protein Meals',
  },
  {
    id: 'glow-salad',
    name: 'Rainbow Glow Salad',
    partner: 'Salad Days',
    price: 329,
    image: HERO_DISH_IMAGES.glowSalad,
    query: 'Salads & Bowls',
  },
  {
    id: 'keto-tray',
    name: 'Keto Chicken Tray',
    partner: 'Lean Crust',
    price: 399,
    image: HERO_DISH_IMAGES.ketoTray,
    query: 'Protein Meals',
  },
  {
    id: 'buddha-bowl',
    name: 'Satvik Buddha Bowl',
    partner: 'Yogisthaan Cafe',
    price: 299,
    image: HERO_DISH_IMAGES.buddhaBowl,
    query: 'Plant-Based',
  },
  {
    id: 'acai-bowl',
    name: 'Acai Superfood Bowl',
    partner: 'Bliss Bowl Co',
    price: 349,
    image: HERO_DISH_IMAGES.acaiBowl,
    query: 'Superfoods',
  },
  {
    id: 'green-juice',
    name: 'Cold-Pressed Green Juice',
    partner: 'FreshMenu Kitchen',
    price: 149,
    image: HERO_DISH_IMAGES.greenJuice,
    query: 'Smoothies',
  },
];

const AUTO_MS = 4500;

export default function HeroFoodCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();
  const touchStartX = useRef(null);
  const total = HERO_FOODS.length;
  const current = HERO_FOODS[index];

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % total);
  }, [total]);

  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(goNext, AUTO_MS);
    return () => clearInterval(id);
  }, [paused, goNext]);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 48) goPrev();
    else if (delta < -48) goNext();
    touchStartX.current = null;
  };

  // Trailing queued items on the right side
  const upcomingQueue = [
    HERO_FOODS[(index + 1) % total],
    HERO_FOODS[(index + 2) % total],
    HERO_FOODS[(index + 3) % total],
  ];

  return (
    <div
      className="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Left Thin Chevron ── */}
      <button
        type="button"
        className="carousel-chevron left-chevron"
        onClick={goPrev}
        aria-label="Previous dish"
      >
        &#x2039;
      </button>

      {/* ── Main Center Spotlight ── */}
      <div className="carousel-spotlight">
        <span className="carousel-badge">Fast Delivery 🚚</span>

        <div key={current.id} className="carousel-plate-wrap">
          <div className="carousel-plate">
            <FoodImage
              src={current.image}
              alt={current.name}
              className="carousel-plate-img"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>

        <p className="carousel-dish-label">{current.name}</p>
        <p className="carousel-price">{formatPrice(current.price)}</p>

        <button
          type="button"
          className="carousel-add-btn"
          onClick={() => navigate(`/restaurants?q=${encodeURIComponent(current.query)}`)}
          aria-label={`Order ${current.name}`}
        >
          +
        </button>
      </div>

      {/* ── Right Thin Chevron ── */}
      <button
        type="button"
        className="carousel-chevron right-chevron"
        onClick={goNext}
        aria-label="Next dish"
      >
        &#x203A;
      </button>

      {/* ── Trailing Circular Queue (Right) ── */}
      <div className="carousel-queue-trail" aria-hidden="true">
        {upcomingQueue.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            className={`queue-node queue-node-${idx}`}
            onClick={() => setIndex(HERO_FOODS.findIndex((f) => f.id === item.id))}
          >
            <FoodImage src={item.image} alt={item.name} className="queue-node-img" />
          </button>
        ))}
      </div>
    </div>
  );
}