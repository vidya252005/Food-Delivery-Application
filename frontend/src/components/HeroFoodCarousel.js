import React, { useState, useCallback } from 'react';
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

export default function HeroFoodCarousel() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const total = HERO_FOODS.length;
  const current = HERO_FOODS[index];
  const nextOne = HERO_FOODS[(index + 1) % total];
  const nextTwo = HERO_FOODS[(index + 2) % total];

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % total);
  }, [total]);

  return (
    <div className="hero-carousel">
      <button type="button" className="carousel-arrow carousel-arrow-left" onClick={goPrev} aria-label="Previous dish">
        ‹
      </button>

      <div className="carousel-center">
        <span className="carousel-badge">Fast Delivery · Bengaluru</span>
        <div className="carousel-plate">
              <FoodImage
                src={current.image}
                alt={current.name}
                className="carousel-plate-img"
                loading="eager"
                fetchPriority="high"
              />
        </div>
        <p className="carousel-dish-label">{current.name}</p>
        <div className="carousel-price-row">
          <span className="carousel-price">{formatPrice(current.price)}</span>
          <button
            type="button"
            className="carousel-add-btn"
            onClick={() => navigate(`/restaurants?q=${encodeURIComponent(current.query)}`)}
            aria-label={`Browse ${current.name}`}
          >
            +
          </button>
        </div>
      </div>

      <div className="carousel-upnext" aria-hidden="true">
        <FoodImage src={nextOne.image} alt="" className="carousel-upnext-img" />
        <FoodImage src={nextTwo.image} alt="" className="carousel-upnext-img carousel-upnext-img--dim" />
      </div>

      <button type="button" className="carousel-arrow carousel-arrow-right" onClick={goNext} aria-label="Next dish">
        ›
      </button>
    </div>
  );
}
