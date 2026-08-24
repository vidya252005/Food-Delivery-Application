import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocation as useGeoLocation } from '../context/LocationContext';
import { restaurantAPI } from '../utils/api';
import { useCart } from '../context/CartContext';
import { resolveMenuItemImage, resolveRestaurantImage } from '../utils/foodImages';
import { formatPrice } from '../utils/format';
import FoodImage from '../components/FoodImage';
import QualityBadges, { QualityScoreBreakdown } from '../components/QualityBadges';
import NutritionPanel from '../components/NutritionPanel';
import './RestaurantDetail.css';

function RestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isSupported, location: geoLocation } = useGeoLocation();

  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRestaurant();
  }, [id]);

  const fetchRestaurant = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await restaurantAPI.getById(id);
      setRestaurant(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (menuItem) => {
    if (!isSupported) {
      alert(`FoodClub is coming to ${geoLocation?.label || 'your city'} soon! Order in Bengaluru for now.`);
      return;
    }

    addToCart(
      {
        id: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        description: menuItem.description,
        image: resolveMenuItemImage(menuItem),
      },
      { id: restaurant._id, name: restaurant.name }
    );
    alert(`${menuItem.name} added to cart!`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Discovering menu…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>Error loading restaurant</h2>
          <p>{error}</p>
          <button type="button" onClick={() => navigate('/restaurants')}>Back to Restaurants</button>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>Restaurant not found</h2>
          <button type="button" onClick={() => navigate('/restaurants')}>Back to Restaurants</button>
        </div>
      </div>
    );
  }

  return (
    <div className="restaurant-detail-page">
      <div className="restaurant-detail-shell">
        <button type="button" onClick={() => navigate('/restaurants')} className="back-button">
          ← Back to Restaurants
        </button>

        <div className="restaurant-detail-layout">
          <aside className="restaurant-detail-sidebar">
            <div className="restaurant-sidebar-card">
              <div className="restaurant-hero-media">
                <FoodImage
                  src={resolveRestaurantImage(restaurant)}
                  alt={restaurant.name}
                  className="restaurant-banner"
                />
              </div>

              <div className="restaurant-info">
                <h1>{restaurant.name}</h1>

                {restaurant.cuisine?.length > 0 && (
                  <div className="cuisine-tags">
                    {restaurant.cuisine.map((c) => (
                      <span key={c} className="cuisine-tag">{c}</span>
                    ))}
                  </div>
                )}

                <div className="restaurant-meta">
                  <span>⭐ {(restaurant.customerRating || restaurant.rating || 4.0).toFixed(1)}</span>
                  <span>🕒 {restaurant.deliveryTime || restaurant.etaLabel || '25–35 min'}</span>
                  {restaurant.minOrder > 0 && <span>Min {formatPrice(restaurant.minOrder)}</span>}
                </div>

                <QualityBadges restaurant={restaurant} />

                {restaurant.description && (
                  <p className="restaurant-description">{restaurant.description}</p>
                )}

                <QualityScoreBreakdown profile={restaurant.qualityProfile} />

                {(restaurant.address || restaurant.phone) && (
                  <div className="restaurant-contact">
                    {restaurant.address && (
                      <p className="address">
                        📍 {restaurant.address.street}, {restaurant.address.city}
                      </p>
                    )}
                    {restaurant.phone && <p className="phone">📞 {restaurant.phone}</p>}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="restaurant-detail-menu">
            <div className="menu-section-header">
              <h2>Menu</h2>
              {restaurant.menu?.length > 0 && (
                <span className="menu-count">{restaurant.menu.length} items</span>
              )}
            </div>

            {!restaurant.menu?.length ? (
              <div className="no-menu"><p>No menu items available yet.</p></div>
            ) : (
              <div className="menu-list">
                {restaurant.menu.map((item) => (
                  <article key={item._id} className="menu-item-row">
                    <div className="menu-item-media">
                      <FoodImage
                        src={resolveMenuItemImage(item)}
                        alt={item.name}
                        className="menu-item-image"
                      />
                    </div>

                    <div className="menu-item-body">
                      <div className="menu-item-header">
                        <h3>{item.name}</h3>
                        <p className="price">{formatPrice(item.price)}</p>
                      </div>

                      {item.description && (
                        <p className="description">{item.description}</p>
                      )}

                      <NutritionPanel item={item} />

                      <div className="menu-tags">
                        {item.category && <span className="category-badge">{item.category}</span>}
                        {item.spicyLevel && <span className="spicy-badge">🌶️ {item.spicyLevel}</span>}
                        {item.preparationTime && (
                          <span className="prep-time">⏱️ {item.preparationTime} min</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        disabled={!item.available}
                        className={`add-to-cart-button${!item.available ? ' disabled' : ''}`}
                      >
                        {item.available ? 'Add to Cart' : 'Not Available'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default RestaurantDetail;
