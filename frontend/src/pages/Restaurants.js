import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { restaurantAPI, foodclubAPI } from '../utils/api';
import { resolveRestaurantImage } from '../utils/foodImages';
import { formatPrice, formatDistance } from '../utils/format';
import FoodImage from '../components/FoodImage';
import MapView from '../components/MapView';
import QualityBadges from '../components/QualityBadges';
import DietaryFilterBar from '../components/DietaryFilterBar';
import ComingSoon from '../components/ComingSoon';
import './Restaurants.css';

const DEFAULT_FILTERS = {
  dietaryTags: [],
  selectOnly: false,
  minQualityScore: '',
  maxCalories: '',
};

function Restaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const { location, detectLocation, isSupported, saveLocation } = useLocation();
  const { isLoggedIn } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);
    if (searchParams.get('select') === 'true') {
      setFilters((f) => ({ ...f, selectOnly: true }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoggedIn || prefsLoaded) return;
    foodclubAPI.getPreferences()
      .then((prefs) => {
        setFilters((f) => ({
          ...f,
          dietaryTags: prefs.dietaryTags?.length ? prefs.dietaryTags : f.dietaryTags,
          maxCalories: prefs.maxCalories ? String(prefs.maxCalories) : f.maxCalories,
        }));
      })
      .catch(() => {})
      .finally(() => setPrefsLoaded(true));
  }, [isLoggedIn, prefsLoaded]);

  const fetchRestaurants = useCallback(async () => {
    if (!isSupported) {
      setLoading(false);
      setRestaurants([]);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const q = searchParams.get('q') || searchQuery.trim();
      const hasFilters = filters.dietaryTags.length > 0
        || filters.selectOnly
        || filters.minQualityScore
        || filters.maxCalories;

      const params = {
        lat: location?.lat,
        lng: location?.lng,
        keyword: q || undefined,
        dietaryTag: filters.dietaryTags.length ? filters.dietaryTags : undefined,
        selectOnly: filters.selectOnly || undefined,
        minQualityScore: filters.minQualityScore || undefined,
        maxCalories: filters.maxCalories || undefined,
      };

      let data;
      if (hasFilters || q) {
        data = await restaurantAPI.discover(params);
      } else if (location?.lat) {
        data = await restaurantAPI.getNearby(location.lat, location.lng);
      } else {
        data = await restaurantAPI.getAll();
      }
      setRestaurants(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [location, searchParams, searchQuery, filters, isSupported]);

  useEffect(() => {
    if (isLoggedIn && !prefsLoaded) return;
    fetchRestaurants();
  }, [fetchRestaurants, isLoggedIn, prefsLoaded]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRestaurants();
  };

  if (!isSupported) {
    return (
      <ComingSoon
        cityLabel={location?.label || location?.city}
        onSelectBengaluru={saveLocation}
      />
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Discovering curated FoodClub partners in Bengaluru…</div>
      </div>
    );
  }

  return (
    <div className="restaurants-page">
      <div className="restaurants-header">
        <h1>Discover curated partners</h1>
        <p>Quality-scored restaurants with nutrition transparency · 📍 {location?.label || 'Bengaluru'}</p>

        <button type="button" className="location-detect" onClick={detectLocation}>
          📍 Update my location
        </button>

        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="High protein, organic, under 600 kcal…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">Search</button>
        </form>
      </div>

      <DietaryFilterBar filters={filters} onChange={setFilters} />

      {error && (
        <div className="error-container">
          <p>{error}</p>
          <button type="button" onClick={fetchRestaurants}>Try Again</button>
        </div>
      )}

      <div className="restaurants-map-section">
        <MapView userLocation={location} restaurants={restaurants.slice(0, 12)} height="280px" />
      </div>

      <div className="restaurants-container">
        {restaurants.length === 0 ? (
          <div className="no-restaurants">
            <p>No partners match your filters — try broadening your search.</p>
          </div>
        ) : (
          <div className="restaurants-grid">
            {restaurants.map((restaurant) => (
              <Link to={`/restaurant/${restaurant._id}`} key={restaurant._id} className="restaurant-card">
                <div className="restaurant-image">
                  <FoodImage
                    src={resolveRestaurantImage(restaurant)}
                    alt={restaurant.name}
                    className="restaurant-photo"
                  />
                </div>
                <div className="restaurant-info">
                  <div className="restaurant-name-row">
                    <h3>{restaurant.name}</h3>
                    <span className="rating-badge">⭐ {restaurant.rating || 4.5}</span>
                  </div>
                  <QualityBadges restaurant={restaurant} compact />
                  {restaurant.description && (
                    <p className="restaurant-desc">{restaurant.description.slice(0, 90)}…</p>
                  )}
                  {restaurant.cuisine?.length > 0 && (
                    <p className="cuisine">{restaurant.cuisine.join(' · ')}</p>
                  )}
                  <div className="restaurant-meta">
                    {restaurant.distanceKm != null && (
                      <span>📍 {formatDistance(restaurant.distanceKm)}</span>
                    )}
                    <span>🕒 {restaurant.etaLabel || restaurant.deliveryTime || '25-35 min'}</span>
                    {restaurant.minOrder > 0 && <span>Min {formatPrice(restaurant.minOrder)}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Restaurants;
