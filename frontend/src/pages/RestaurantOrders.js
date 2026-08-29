import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRestaurant } from "../context/RestaurantContext";
import { orderAPI } from "../utils/api";
import { getOrderStatusColor } from "../utils/statusColors";
import { formatPrice } from "../utils/format";
import { formatStatusLabel } from "../utils/orderStatus";
import "./RestaurantOrders.css";

const RestaurantOrders = () => {
  const { restaurant, isLoggedIn: isRestaurantLoggedIn } = useRestaurant();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");

  const ORDER_STATUSES = [
    "All", "confirmed", "restaurant_accepted", "preparing",
    "ready_for_pickup", "out_for_delivery", "delivered", "cancelled",
  ];

  useEffect(() => {
    if (!isRestaurantLoggedIn) {
      navigate("/restaurant-login");
      return;
    }
    fetchOrders();

    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [isRestaurantLoggedIn, navigate]);

  const fetchOrders = async () => {
    try {
      const restaurantId = restaurant?._id || restaurant?.id;
      if (!restaurantId) {
        setOrders([]);
        setLoading(false);
        return;
      }
      const data = await orderAPI.getRestaurantOrders(restaurantId);
      setOrders(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const runAction = async (orderId, action) => {
    try {
      await orderAPI[action](orderId);
      fetchOrders();
    } catch (err) {
      alert(err.message || "Action failed");
    }
  };

  const getStatusColor = getOrderStatusColor;

  const getActions = (status) => {
    switch (status) {
      case "confirmed": return [{ label: "Accept", action: "accept" }, { label: "Reject", action: "reject" }];
      case "restaurant_accepted": return [{ label: "Start Preparing", action: "startPreparing" }];
      case "preparing": return [{ label: "Mark Ready", action: "markReady" }];
      default: return [];
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const filteredOrders = Array.isArray(orders)
    ? filterStatus === "All"
      ? orders
      : orders.filter((order) => order.status === filterStatus)
    : [];

  const orderCounts = Array.isArray(orders)
    ? {
        all: orders.length,
        pending: orders.filter((o) => ["confirmed", "restaurant_accepted"].includes(o.status)).length,
        preparing: orders.filter((o) => o.status === "preparing").length,
        ready: orders.filter((o) => o.status === "ready_for_pickup").length,
        delivered: orders.filter((o) => o.status === "delivered").length,
        cancelled: orders.filter((o) => o.status === "cancelled").length,
      }
    : { all: 0, pending: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0 };

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  return (
    <div className="restaurant-orders-page">
      <div className="orders-container">
        <div className="orders-header">
          <div>
            <h1>Orders Management</h1>
            <p>Manage and track all your restaurant orders</p>
          </div>
          <button className="refresh-btn" onClick={fetchOrders}>
            🔄 Refresh
          </button>
        </div>

        <div className="status-filter">
          {ORDER_STATUSES.map((status) => (
            <button
              key={status}
              className={`filter-btn ${
                filterStatus === status ? "active" : ""
              }`}
              onClick={() => setFilterStatus(status)}
            >
              {status === "All" ? `All (${orderCounts.all})` : formatStatusLabel(status)}
            </button>
          ))}
        </div>

        {!Array.isArray(filteredOrders) || filteredOrders.length === 0 ? (
          <div className="no-orders">
            <h2>📦 No {filterStatus !== "All" ? formatStatusLabel(filterStatus) : ""} orders</h2>
            <p>Orders will appear here when customers place them</p>
          </div>
        ) : (
          <div className="orders-grid">
            {filteredOrders.map((order) => (
              <div key={order._id || order.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <h3>{order.orderNumber || `#${(order._id || order.id || '').slice(0, 8)}`}</h3>
                    <p className="order-time">{formatTime(order.createdAt)}</p>
                  </div>
                  <span
                    className="order-status-badge"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {formatStatusLabel(order.status)}
                  </span>
                </div>

                <div className="customer-info">
                  <h4>👤 {order.customer?.name || order.user?.name || "Customer"}</h4>
                  <p>📞 {order.customer?.phone || order.user?.phone || "N/A"}</p>
                  <p>📍 {order.deliveryAddress?.street || order.customer?.address || "N/A"}</p>
                </div>

                <div className="order-items-list">
                  <h4>Items:</h4>
                  {order.items?.map((item, index) => (
                    <div key={index} className="order-item-row">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="order-card-footer">
                  <div className="order-total">
                    <strong>Total: {formatPrice(order.totalAmount)}</strong>
                  </div>
                  <div className="order-actions">
                    {getActions(order.status).map(({ label, action }) => (
                      <button
                        key={action}
                        type="button"
                        className="update-status-btn"
                        onClick={() => runAction(order._id || order.id, action)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantOrders;
