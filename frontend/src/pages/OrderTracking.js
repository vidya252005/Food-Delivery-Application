import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { orderAPI } from '../utils/api';
import MapView from '../components/MapView';
import { getOrderStatusColor } from '../utils/statusColors';
import { formatPrice } from '../utils/format';
import OrderNutritionSummary from '../components/OrderNutritionSummary';
import './OrderTracking.css';

const STATUS_STEPS = [
  'created', 'payment_pending', 'confirmed', 'restaurant_accepted',
  'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered',
];

const STATUS_LABELS = {
  created: 'Created',
  payment_pending: 'Payment Pending',
  confirmed: 'Confirmed',
  restaurant_accepted: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { joinOrder, onOrderUpdate, onDriverLocation } = useSocket();
  const [order, setOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    orderAPI.getById(orderId)
      .then((data) => {
        setOrder(data);
        if (data.driverLocation) setDriverLocation(data.driverLocation);
      })
      .catch(() => navigate('/orders'))
      .finally(() => setLoading(false));
  }, [orderId, isLoggedIn, navigate]);

  useEffect(() => {
    if (!orderId) return undefined;
    joinOrder(orderId);
    const unsubOrder = onOrderUpdate?.(({ order: updated }) => {
      if (updated?.id === orderId || updated?._id === orderId) setOrder(updated);
    });
    const unsubDriver = onDriverLocation?.((data) => {
      if (data.orderId === orderId) setDriverLocation({ lat: data.lat, lng: data.lng });
    });
    return () => { unsubOrder?.(); unsubDriver?.(); };
  }, [orderId, joinOrder, onOrderUpdate, onDriverLocation]);

  if (loading) return <div className="tracking-loading">Loading order...</div>;
  if (!order) return null;

  const currentStep = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="order-tracking-page">
      <div className="tracking-header">
        <button type="button" className="back-btn" onClick={() => navigate('/orders')}>← Back</button>
        <h1>Track Order</h1>
        <p className="order-id">Order #{String(order._id).slice(0, 8)}</p>
      </div>

      <div className="tracking-status-card">
        <h2>{order.status === 'delivered' ? 'Delivered!' : STATUS_LABELS[order.status] || order.status}</h2>
        {order.etaMinutes && order.status !== 'delivered' && (
          <p className="eta">ETA: <strong>{order.etaMinutes} min</strong></p>
        )}
        <div className="status-timeline">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className={`timeline-step ${i <= currentStep ? 'done' : ''} ${i === currentStep ? 'active' : ''}`}>
              <div className="step-dot" style={i <= currentStep ? { background: getOrderStatusColor(step) } : undefined} />
              <span>{STATUS_LABELS[step] || step}</span>
            </div>
          ))}
        </div>
      </div>

      <MapView
        restaurantLocation={order.restaurantLocation}
        deliveryLocation={order.deliveryLocation}
        driverLocation={driverLocation}
        showRoute={['out_for_delivery', 'delivered'].includes(order.status)}
        height="450px"
      />

      <div className="tracking-details">
        <h3>{typeof order.restaurant === 'object' ? order.restaurant.name : 'Restaurant'}</h3>
        <p>{order.items?.length} items • {formatPrice(order.totalAmount)}</p>
        <OrderNutritionSummary order={order} compact />
      </div>
    </div>
  );
}
