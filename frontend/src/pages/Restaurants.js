import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { restaurantAPI, foodclubAPI } from '../utils/api';
import MapView from '../components/MapView';
import DietaryFilterBar from '../components/DietaryFilterBar';
import RestaurantCard from '../components/RestaurantCard';
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
  const [mapRestaurants, setMapRestaurants] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const { location, detectLocation, isSupported, saveLocation, loading: locationLoading } = useLocation();
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

  useEffect(() => {
    restaurantAPI.getAll()
      .then(setMapRestaurants)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem('locationPrompted')) return;
    sessionStorage.setItem('locationPrompted', '1');
    if (navigator.geolocation && !localStorage.getItem('userLocation')) {
      detectLocation();
    }
  }, [detectLocation]);

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

  const topRated = useMemo(() => {
    return [...restaurants]
      .sort((a, b) => {
        const sa = a.qualityScore ?? a.qualityProfile?.overallScore ?? 0;
        const sb = b.qualityScore ?? b.qualityProfile?.overallScore ?? 0;
        if (sb !== sa) return sb - sa;
        return (b.rating || 0) - (a.rating || 0);
      })
      .slice(0, 6);
  }, [restaurants]);

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
    <div className="discover-page">
      <header className="discover-hero">
        <p className="discover-eyebrow">DISCOVER • QUALITY • NUTRITION</p>
        <h1 className="discover-title">Discover curated partners</h1>
        <p className="discover-lead">
          Quality-scored restaurants with nutrition transparency
          {' · '}
          <span className="discover-city">📍 {location?.label || 'Bengaluru'}</span>
        </p>
        <button
          type="button"
          className="discover-location-btn"
          onClick={detectLocation}
          disabled={locationLoading}
        >
          {locationLoading ? 'Locating…' : '📍 Update my location'}
        </button>
      </header>

      <form onSubmit={handleSearch} className="discover-search">
        <input
          type="text"
          placeholder="High protein, organic, under 600 kcal…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="discover-search-input"
          aria-label="Search restaurants"
        />
        <button type="submit" className="discover-search-btn">Search</button>
      </form>

      <div className="discover-filters-wrap">
        <DietaryFilterBar filters={filters} onChange={setFilters} />
      </div>

      {error && (
        <div className="discover-error">
          <p>{error}</p>
          <button type="button" onClick={fetchRestaurants}>Try Again</button>
        </div>
      )}

      <div className="discover-map-wrap">
        <MapView
          userLocation={location}
          restaurants={mapRestaurants.length ? mapRestaurants : restaurants}
          height="340px"
          showDeliveryRadius
        />
        <p className="discover-map-caption">
          {location?.label
            ? `Showing ${(mapRestaurants.length || restaurants.length)} partners near ${location.label}`
            : 'Allow location to see nearby partners on the map'}
        </p>
      </div>

      {topRated.length > 0 && (
        <section className="discover-featured">
          <div className="discover-section-head">
            <h2 className="discover-section-title">Top rated partners near you</h2>
            <button type="button" className="discover-scroll-btn" aria-hidden="true">›</button>
          </div>
          <div className="discover-carousel">
            {topRated.map((restaurant) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} compact />
            ))}
          </div>
        </section>
      )}

      <section className="discover-grid-section">
        <div className="discover-grid-header">
          <h2 className="discover-section-title">
            {restaurants.length} partner{restaurants.length !== 1 ? 's' : ''} in Bengaluru
          </h2>
        </div>

        {restaurants.length === 0 ? (
          <div className="discover-empty">
            <p>No partners match your filters — try broadening your search.</p>
          </div>
        ) : (
          <div className="discover-grid">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Restaurants;
