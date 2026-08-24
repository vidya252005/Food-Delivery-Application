import React from 'react';
import { Link } from 'react-router-dom';
import FoodImage from './FoodImage';
import { resolveRestaurantImage } from '../utils/foodImages';
import { formatPrice, formatDistance } from '../utils/format';
import { formatDietaryTag } from './QualityBadges';
import './RestaurantCard.css';

function getScore(restaurant) {
  return restaurant?.qualityProfile?.overallScore ?? restaurant?.qualityScore;
}

export default function RestaurantCard({ restaurant, compact = false }) {
  const score = getScore(restaurant);
  const exceptional = score != null && score >= 90;
  const tags = (restaurant.supportedDietaryTags || []).slice(0, 3);
  const cuisine = restaurant.cuisine?.slice(0, 2).join(' · ');

  return (
    <Link
      to={`/restaurant/${restaurant._id || restaurant.id}`}
      className={`restaurant-card-v2${compact ? ' restaurant-card-v2--compact' : ''}`}
    >
      <div className="restaurant-card-v2__media">
        <FoodImage
          src={resolveRestaurantImage(restaurant)}
          alt={restaurant.name}
          className="restaurant-card-v2__img"
        />
        <button
          type="button"
          className="restaurant-card-v2__heart"
          aria-label="Save restaurant"
          onClick={(e) => e.preventDefault()}
        >
          ♡
        </button>
        {restaurant.selectEligible && (
          <span className="restaurant-card-v2__select-pill">✦ SELECT</span>
        )}
      </div>

      <div className="restaurant-card-v2__body">
        <div className="restaurant-card-v2__head">
          {score != null && (
            <span
              className={`restaurant-card-v2__score${exceptional ? ' restaurant-card-v2__score--gold' : ''}`}
              title="FoodClub Quality Score"
            >
              {score}
            </span>
          )}
          <div className="restaurant-card-v2__info">
            <div className="restaurant-card-v2__name-row">
              <h3 className="restaurant-card-v2__name">{restaurant.name}</h3>
              <span className="restaurant-card-v2__rating">
                <span className="restaurant-card-v2__star" aria-hidden="true">★</span>
                {(restaurant.rating || 4.5).toFixed(1)}
              </span>
            </div>
            {cuisine && !compact && (
              <p className="restaurant-card-v2__cuisine">{cuisine}</p>
            )}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="restaurant-card-v2__tags">
            {tags.map((tag) => (
              <span key={tag} className="restaurant-card-v2__tag">
                {formatDietaryTag(tag)}
              </span>
            ))}
          </div>
        )}

        {!compact && restaurant.description && (
          <p className="restaurant-card-v2__desc">{restaurant.description}</p>
        )}

        <div className="restaurant-card-v2__meta">
          {restaurant.distanceKm != null && (
            <span>📍 {formatDistance(restaurant.distanceKm)}</span>
          )}
          <span>🕒 {restaurant.etaLabel || restaurant.deliveryTime || '25–35 min'}</span>
          {restaurant.minOrder > 0 && <span>Min {formatPrice(restaurant.minOrder)}</span>}
        </div>
      </div>
    </Link>
  );
}
