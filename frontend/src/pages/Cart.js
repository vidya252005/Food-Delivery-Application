import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { foodclubAPI } from '../utils/api';
import { resolveMenuItemImage } from '../utils/foodImages';
import { formatPrice } from '../utils/format';
import { calculateCartPricing } from '../utils/pricing';
import { loginPathWithRedirect } from '../utils/authRedirect';
import FoodImage from '../components/FoodImage';
import ComingSoon from '../components/ComingSoon';
import './Cart.css';

function Cart() {
  const {
    cartItems,
    restaurant,
    clearCart,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const { user, isLoggedIn, role } = useAuth();
  const { isSupported, location, saveLocation } = useLocation();
  const navigate = useNavigate();

  const [isSelectMember, setIsSelectMember] = useState(false);

  useEffect(() => {
    if (isLoggedIn && role === 'user') {
      foodclubAPI.getMembership()
        .then((m) => setIsSelectMember(m.tier === 'select' && m.active))
        .catch(() => setIsSelectMember(false));
    }
  }, [isLoggedIn, role]);

  const pricing = useMemo(
    () => calculateCartPricing(cartItems, { isSelectMember }),
    [cartItems, isSelectMember]
  );

  const handleCheckout = () => {
    if (!isSupported) return;
    if (cartItems.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    if (!isLoggedIn) {
      navigate(loginPathWithRedirect('/cart'));
      return;
    }
    navigate('/payment');
  };

  if (!isSupported) {
    return (
      <ComingSoon
        cityLabel={location?.label || location?.city}
        onSelectBengaluru={saveLocation}
      />
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-empty-page">
        <div className="cart-empty-content">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add curated dishes from Bengaluru partners!</p>
          <button type="button" className="browse-button" onClick={() => navigate('/restaurants')}>
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-main">
          <h1>🛍️ Your Cart</h1>

          {!isLoggedIn && (
            <div className="cart-guest-banner">
              <div className="cart-guest-banner__text">
                <strong>Almost there!</strong>
                <span>Sign in or create an account to place your order. Your cart is saved on this device.</span>
              </div>
              <div className="cart-guest-banner__actions">
                <button
                  type="button"
                  className="cart-guest-btn cart-guest-btn--primary"
                  onClick={() => navigate(loginPathWithRedirect('/cart'))}
                >
                  Sign in
                </button>
                <Link
                  to={{ pathname: '/signup', search: '?redirect=%2Fcart' }}
                  state={{ from: { pathname: '/cart' } }}
                  className="cart-guest-btn cart-guest-btn--outline"
                >
                  Sign up
                </Link>
              </div>
            </div>
          )}

          {restaurant && (
            <div className="cart-restaurant-info">
              <h3>
                Ordering from: <strong>{restaurant.name}</strong>
              </h3>
            </div>
          )}

          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item-card">
                <div className="cart-item-image">
                  <FoodImage
                    src={resolveMenuItemImage(item)}
                    alt={item.name}
                  />
                </div>

                <div className="cart-item-details">
                  <h4>{item.name}</h4>
                  {item.description && (
                    <p className="item-description">{item.description}</p>
                  )}
                  <p className="item-price">{formatPrice(item.price)} each</p>

                  <div className="quantity-controls">
                    <button
                      type="button"
                      className="quantity-btn"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button
                      type="button"
                      className="quantity-btn"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="cart-item-right">
                  <p className="total-price">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                  <button
                    type="button"
                    className="remove-item-btn"
                    onClick={() => removeFromCart(item.id)}
                    title="Remove item"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cart-sidebar">
          <div className="cart-summary">
            <h3>Order Summary</h3>
            {isSelectMember && (
              <p className="select-savings-badge">✦ FoodClub Select savings applied</p>
            )}

            <div className="summary-details">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>{formatPrice(pricing.subtotal)}</span>
              </div>
              {pricing.discount > 0 && (
                <div className="summary-row discount-row">
                  <span>Select discount (5%):</span>
                  <span>−{formatPrice(pricing.discount)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>GST (5%):</span>
                <span>{formatPrice(pricing.tax)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee:</span>
                <span>{pricing.deliveryFee === 0 ? 'FREE' : formatPrice(pricing.deliveryFee)}</span>
              </div>

              <div className="summary-divider" />

              <div className="summary-row summary-total">
                <strong>Total:</strong>
                <strong>{formatPrice(pricing.total)}</strong>
              </div>
            </div>

            <button type="button" className="checkout-btn" onClick={handleCheckout}>
              {isLoggedIn ? 'Proceed to Payment 💳' : 'Sign in to checkout'}
            </button>

            <button type="button" className="continue-shopping-btn" onClick={() => navigate('/restaurants')}>
              ← Continue Shopping
            </button>
          </div>

          {isLoggedIn && user ? (
            <div className="delivery-info">
              <h4>Delivery Address</h4>
              {user.address?.street ? (
                <p>
                  {user.address.street}
                  <br />
                  {user.address.city}, {user.address.state} {user.address.zipCode}
                </p>
              ) : (
                <p className="no-address">Add your Bengaluru address at checkout.</p>
              )}
            </div>
          ) : (
            <div className="cart-guest-note">
              <p>Guest browsing — no account needed to explore. Sign in when you&apos;re ready to checkout.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Cart;
