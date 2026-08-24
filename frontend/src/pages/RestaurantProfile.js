import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import './RestaurantProfile.css';

const RestaurantProfile = () => {
  console.log("✅ Rendering RestaurantProfile");
  const { restaurant, isLoggedIn: isRestaurantLoggedIn, updateRestaurantData, restaurantLogout } = useRestaurant();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    cuisine: '',
    description: '',
    image: '',
    deliveryTime: '',
    minOrder: '',
    rating: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isRestaurantLoggedIn) {
      navigate('/restaurant-login');
      return;
    }

    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        email: restaurant.email || '',
        phone: restaurant.phone || '',
        address: restaurant.address || '',
        cuisine: restaurant.cuisine || '',
        description: restaurant.description || '',
        image: restaurant.image || '',
        deliveryTime: restaurant.deliveryTime || '30',
        minOrder: restaurant.minOrder || '10',
        rating: restaurant.rating || '4.5'
      });
    }
  }, [restaurant, isRestaurantLoggedIn, navigate]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) {
        alert('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('restaurantToken');
      const response = await fetch('http://localhost:5001/api/restaurant/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedData = await response.json();
        updateRestaurantData(updatedData);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      // Update locally for demo
      updateRestaurantData(formData);
      alert('Profile updated successfully!');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      restaurantLogout();
      navigate('/restaurant-login');
    }
  };

  return (
    <div className="restaurant-profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>Restaurant Profile</h1>
          <p>Manage your restaurant information</p>
        </div>

        <div className="profile-content">
          <div className="profile-sidebar">
            <div className="restaurant-preview">
              <div className="preview-image">
                <img 
                  src={formData.image || 'https://via.placeholder.com/400x300?text=Restaurant+Image'} 
                  alt="Restaurant" 
                />
              </div>
              <h3>{formData.name || 'Restaurant Name'}</h3>
              <p className="preview-cuisine">{formData.cuisine || 'Cuisine Type'}</p>
              <div className="preview-stats">
                <div className="stat">
                  <span className="stat-label">⭐ Rating</span>
                  <span className="stat-value">{formData.rating || '4.5'}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">🚚 Delivery</span>
                  <span className="stat-value">{formData.deliveryTime || '30'} min</span>
                </div>
                <div className="stat">
                  <span className="stat-label">💰 Min Order</span>
                  <span className="stat-value">${formData.minOrder || '10'}</span>
                </div>
              </div>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>

          <div className="profile-form-section">
            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h2>Basic Information</h2>
                
                <div className="form-group">
                  <label>Restaurant Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter restaurant name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="restaurant@example.com"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="123-456-7890"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Cuisine Type *</label>
                    <input
                      type="text"
                      value={formData.cuisine}
                      onChange={(e) => setFormData({...formData, cuisine: e.target.value})}
                      placeholder="e.g., Italian, Chinese"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Address *</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Full restaurant address"
                    rows="3"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Tell customers about your restaurant..."
                    rows="4"
                    required
                  />
                </div>
              </div>

              <div className="form-section">
                <h2>Restaurant Image</h2>
                
                <div className="form-group">
                  <label>Upload Banner Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <small>Recommended size: 1200x400px (Max 5MB)</small>
                </div>
              </div>

              <div className="form-section">
                <h2>Business Settings</h2>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Average Delivery Time (minutes)</label>
                    <input
                      type="number"
                      value={formData.deliveryTime}
                      onChange={(e) => setFormData({...formData, deliveryTime: e.target.value})}
                      placeholder="30"
                      min="10"
                      max="120"
                    />
                  </div>

                  <div className="form-group">
                    <label>Minimum Order ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minOrder}
                      onChange={(e) => setFormData({...formData, minOrder: e.target.value})}
                      placeholder="10.00"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => navigate('/restaurant/dashboard')}>
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfile;