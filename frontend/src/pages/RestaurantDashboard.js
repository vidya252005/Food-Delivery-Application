import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { restaurantAPI, orderAPI } from '../utils/api';
import { getOrderStatusColor } from '../utils/statusColors';
import { formatPrice } from '../utils/format';
import QualityBadges, { QualityScoreBreakdown } from '../components/QualityBadges';
import './RestaurantDashboard.css';

const RestaurantDashboard = () => {
  const { restaurant, isLoggedIn } = useRestaurant();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    totalMenuItems: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/restaurant-login');
      return;
    }
    const run = async () => {
      await fetchDashboardData();
      setLoading(false);
    };
    run();

    // poll every 8s for new orders
    const id = setInterval(fetchDashboardData, 8000);
    return () => clearInterval(id);
  }, [isLoggedIn, navigate]);

  const fetchDashboardData = async () => {
    try {
      const rid = restaurant?.id || restaurant?._id;
      if (!rid) return;
  
      // 1️⃣ Fetch stats
      const statsData = await restaurantAPI.getStats();
  
      // 2️⃣ Fetch orders (for recent orders table)
      const orders = await orderAPI.getRestaurantOrders(rid);

      const [profileData, verificationData] = await Promise.all([
        restaurantAPI.getProfile().catch(() => null),
        restaurantAPI.getVerificationStatus().catch(() => null),
      ]);
  
      setStats(statsData);
      setRecentOrders(orders.slice(0, 5));
      setProfile(profileData);
      setVerification(verificationData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };
  

  const getStatusColor = getOrderStatusColor;

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="restaurant-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Welcome back, {restaurant?.name}! 👋</h1>
          <p>Here's what's happening with your restaurant today</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--green-100)' }}>📦</div>
            <div className="stat-info">
              <h3>{stats.totalOrders}</h3>
              <p>Total Orders</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--green-200)' }}>⏳</div>
            <div className="stat-info">
              <h3>{stats.pendingOrders}</h3>
              <p>Pending Orders</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--green-100)' }}>💰</div>
            <div className="stat-info">
              <h3>{formatPrice(stats.todayRevenue)}</h3>
              <p>Today's Revenue</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--green-200)' }}>🍽️</div>
            <div className="stat-info">
              <h3>{stats.totalMenuItems}</h3>
              <p>Menu Items</p>
            </div>
          </div>
        </div>

        {profile && (
          <div className="quality-widget">
            <div className="quality-widget-header">
              <div>
                <h2>FoodClub Quality</h2>
                <p>Your quality score and verification status on the marketplace</p>
              </div>
              <QualityBadges restaurant={profile} />
            </div>
            <div className="quality-widget-body">
              <QualityScoreBreakdown profile={profile.qualityProfile} />
              <div className="quality-widget-status">
                {profile.verificationStatus === 'verified' ? (
                  <p className="quality-verified">✓ Verified partner — visible in Select-eligible discovery</p>
                ) : verification?.status === 'pending' ? (
                  <p className="quality-pending">⏳ Verification under review — we&apos;ll notify you within 2 business days</p>
                ) : (
                  <>
                    <p className="quality-unverified">Submit evidence to earn your Verified badge and unlock Select eligibility (score 90+).</p>
                    <Link to="/restaurant/verification" className="quality-verify-link">Submit verification →</Link>
                  </>
                )}
                {(profile.qualityProfile?.overallScore ?? 0) >= 90 && profile.verificationStatus === 'verified' && (
                  <p className="quality-select">✦ Select-eligible — your restaurant appears in FoodClub Select discovery</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/restaurant/menu" className="action-card">
              <span className="action-icon">📋</span>
              <h3>Manage Menu</h3>
              <p>Add, edit or remove menu items</p>
            </Link>

            <Link to="/restaurant/orders" className="action-card">
              <span className="action-icon">📦</span>
              <h3>View Orders</h3>
              <p>Manage incoming orders</p>
            </Link>

            <Link to="/restaurant/profile" className="action-card">
              <span className="action-icon">⚙️</span>
              <h3>Restaurant Profile</h3>
              <p>Update restaurant information</p>
            </Link>

            <Link to="/restaurant/verification" className="action-card">
              <span className="action-icon">✓</span>
              <h3>Verification</h3>
              <p>Submit quality evidence for your badge</p>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="recent-orders-section">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <Link to="/restaurant/orders" className="view-all-link">View All →</Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="no-orders">
              <p>No recent orders</p>
            </div>
          ) : (
            <div className="orders-table">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order._id}>
                      <td><strong>{order.orderNumber || order._id.slice(-6)}</strong></td>
                      <td>{order.customerName || order.user?.name || 'Customer'}</td>
                      <td>{order.items?.length || 0} items</td>
                      <td>{formatPrice(order.totalAmount || order.total)}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(order.status) }}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td>{new Date(order.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantDashboard;
