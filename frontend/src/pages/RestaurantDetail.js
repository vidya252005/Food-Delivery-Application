import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocation as useGeoLocation } from '../context/LocationContext';
import { restaurantAPI } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
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
  const { isLoggedIn } = useAuth();
  const { isSupported, location: geoLocation, saveLocation } = useGeoLocation();

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
      console.log('Fetching restaurant:', id);
      const data = await restaurantAPI.getById(id);
      console.log('Restaurant data:', data);
      setRestaurant(data);
    } catch (err) {
      console.error('Error fetching restaurant:', err);
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
    if (!isLoggedIn) {
      alert('Please login to add items to cart');
      navigate('/login');
      return;
    }

    const restaurantInfo = {
      id: restaurant._id,
      name: restaurant.name,
    };

    const cartItem = {
      id: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      description: menuItem.description,
      image: resolveMenuItemImage(menuItem),
    };

    addToCart(cartItem, restaurantInfo);
    alert(`${menuItem.name} added to cart!`);
  };

  if (loading)
    return (
      <div className="loading-container">
        <div className="loading">🍽️ Loading restaurant...</div>
      </div>
    );

  if (error)
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>Error loading restaurant</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/restaurants')}>
            Back to Restaurants
          </button>
        </div>
      </div>
    );

  if (!restaurant)
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>Restaurant not found</h2>
          <button onClick={() => navigate('/restaurants')}>
            Back to Restaurants
          </button>
        </div>
      </div>
    );

  return (
    <div className="restaurant-detail-page">
      {/* Header Section */}
      <div className="restaurant-header">
        <button onClick={() => navigate('/restaurants')} className="back-button">
          ← Back to Restaurants
        </button>

        <div className="restaurant-card">
          <FoodImage
            src={resolveRestaurantImage(restaurant)}
            alt={restaurant.name}
            className="restaurant-banner"
          />

          <div className="restaurant-info">
            <h1>{restaurant.name}</h1>
            {restaurant.cuisine && restaurant.cuisine.length > 0 && (
              <div className="cuisine-tags">
                {restaurant.cuisine.map((c, i) => (
                  <span key={i} className="cuisine-tag">
                    {c}
                  </span>
                ))}
              </div>
            )}

            <div className="restaurant-meta">
              <span className="rating">⭐ {restaurant.customerRating || restaurant.rating || 4.0}</span>
              <span className="delivery-time">
                🕒 {restaurant.deliveryTime || '30–45 min'}
              </span>
              {restaurant.minOrder > 0 && (
                <span className="min-order">Min: {formatPrice(restaurant.minOrder)}</span>
              )}
            </div>

            <QualityBadges restaurant={restaurant} />
            {restaurant.description && (
              <p className="restaurant-description">{restaurant.description}</p>
            )}
            <QualityScoreBreakdown profile={restaurant.qualityProfile} />

            {restaurant.address && (
              <p className="address">
                📍 {restaurant.address.street}, {restaurant.address.city},{' '}
                {restaurant.address.state}
              </p>
            )}

            {restaurant.phone && (
              <p className="phone">📞 {restaurant.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <div className="menu-section">
        <h2>Menu</h2>

        {!restaurant.menu || restaurant.menu.length === 0 ? (
          <div className="no-menu">
            <p>No menu items available yet.</p>
          </div>
        ) : (
          <div className="menu-grid">
            {restaurant.menu.map((item) => (
              <div key={item._id} className="menu-item-card">
                <FoodImage
                  src={resolveMenuItemImage(item)}
                  alt={item.name}
                  className="menu-item-image"
                />

                <div className="menu-item-content">
                  <div className="menu-item-header">
                    <h3>{item.name}</h3>
                    <p className="price">{formatPrice(item.price)}</p>
                  </div>

                  {item.description && (
                    <p className="description">{item.description}</p>
                  )}

                  <NutritionPanel item={item} />

                  <div className="menu-tags">
                    {item.category && (
                      <span className="category-badge">{item.category}</span>
                    )}
                    {item.spicyLevel && (
                      <span className="spicy-badge">
                        🌶️ {item.spicyLevel}
                      </span>
                    )}
                    {item.preparationTime && (
                      <span className="prep-time">
                        ⏱️ {item.preparationTime} min
                      </span>
                    )}
                  </div>

                  {item.ingredients && item.ingredients.length > 0 && (
                    <p className="ingredients">
                      <small>
                        Ingredients: {item.ingredients.join(', ')}
                      </small>
                    </p>
                  )}

                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.available}
                    className={`add-to-cart-button ${
                      !item.available ? 'disabled' : ''
                    }`}
                  >
                    {item.available ? '🛒 Add to Cart' : 'Not Available'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RestaurantDetail;
