import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderAPI, feedbackAPI } from '../utils/api';
import { loginPathWithRedirect } from '../utils/authRedirect';
import { getOrderStatusColor } from '../utils/statusColors';
import { formatPrice } from '../utils/format';
import {
  CUSTOMER_ORDER_STEPS,
  getCustomerStatusIcon,
  getCustomerStepIndex,
  formatStatusLabel,
} from '../utils/orderStatus';
import OrderNutritionSummary from '../components/OrderNutritionSummary';
import './Orders.css';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState({});
  
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn || !user) {
      navigate(loginPathWithRedirect('/orders'));
      return;
    }
    fetchOrders();
  }, [isLoggedIn, user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await orderAPI.getUserOrders(user.id);
      setOrders(data);
      data.forEach(order => checkFeedbackStatus(order._id));
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkFeedbackStatus = async (orderId) => {
    try {
      const data = await feedbackAPI.getForOrder(orderId);
      setFeedbackStatus((prev) => ({ ...prev, [orderId]: !!data }));
    } catch (err) {
      console.error('Error checking feedback:', err);
    }
  };

  const getStatusColor = getOrderStatusColor;

  const getStatusIcon = getCustomerStatusIcon;

  if (!isLoggedIn) return null;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>Error loading orders</h2>
          <p>{error}</p>
          <button onClick={fetchOrders} className="retry-button">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <div className="orders-header">
          <h1>Your Orders</h1>
          <button className="browse-button" onClick={() => navigate('/restaurants')}>
            🍽️ Order More Food
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">📦</div>
            <h2>No orders yet</h2>
            <p>Start ordering delicious food!</p>
            <button className="browse-button" onClick={() => navigate('/restaurants')}>
              Browse Restaurants
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>{order.restaurant?.name || 'Restaurant'}</h3>
                    <p className="order-date">
                      {new Date(order.createdAt).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div
                    className="order-status"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {getStatusIcon(order.status)} {formatStatusLabel(order.status).toUpperCase()}
                  </div>
                </div>

                <OrderNutritionSummary order={order} />

                {/* 🧾 Order Items */}
                <div className="order-items">
                  <h4>Items:</h4>
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={index}>
                        <span className="item-name">
                          {item.name} x {item.quantity}
                        </span>
                        <span className="item-price">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 🚚 NEW: Order Status Progress Tracker */}
                <div className="order-status-tracker">
                  {CUSTOMER_ORDER_STEPS.map((step) => {
                      const currentIndex = getCustomerStepIndex(order.status);
                      const stepIndex = CUSTOMER_ORDER_STEPS.findIndex((s) => s.key === step.key);
                      const isCompleted = currentIndex >= 0 && stepIndex <= currentIndex;

                      return (
                        <div key={step.key} className="status-step">
                          <div className={`status-circle ${isCompleted ? "completed" : ""}`}></div>
                          <p className={`status-label ${isCompleted ? "completed-text" : ""}`}>
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                </div>

                {/* 📦 Delivery Address & Payment */}
                <div className="order-footer">
                  <div className="order-address">
                    <h4>Delivery Address:</h4>
                    <p>
                      {order.deliveryAddress.street}<br />
                      {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                    </p>
                  </div>
                  <div className="order-total">
                    <h4>Total Amount:</h4>
                    <p className="total-price">{formatPrice(order.totalAmount)}</p>
                    <p className="payment-status">
                      Payment: {order.paymentStatus === 'completed' ? '✅ Paid' : '⏳ Pending'}
                    </p>
                  </div>
                </div>

                {/* ⭐ Feedback Button */}
                <div className="order-actions">
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <button
                      type="button"
                      className="track-button"
                      onClick={() => navigate(`/orders/${order._id}/track`)}
                    >
                      🗺️ Track Live on Map
                    </button>
                  )}
                  {order.status === 'delivered' && !feedbackStatus[order._id] && (
                    <button
                      className="feedback-button"
                      onClick={() => navigate('/feedback', { state: { order } })}
                    >
                      ⭐ Rate Your Experience
                    </button>
                  )}
                  {feedbackStatus[order._id] && (
                    <div className="feedback-submitted">✓ Feedback Submitted</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Orders;
