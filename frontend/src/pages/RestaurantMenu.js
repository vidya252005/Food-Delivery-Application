import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { restaurantAPI } from '../utils/api';
import { resolveMenuItemImage } from '../utils/foodImages';
import { formatPrice } from '../utils/format';
import FoodImage from '../components/FoodImage';
import './RestaurantMenu.css';

const CATEGORIES = [
  'Appetizers',
  'Main Course',
  'Desserts',
  'Beverages',
  'Salads',
  'Soups',
  'Snacks',
  'Breakfast',
  'Sides'
];

export default function RestaurantMenu() {
  const { restaurant, isLoggedIn } = useRestaurant();
  const navigate = useNavigate();

  const restaurantId = useMemo(
    () => restaurant?.id || restaurant?._id,
    [restaurant]
  );

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal + form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main Course',
    image: '',
    available: true
  });

  const [filterCategory, setFilterCategory] = useState('All');

  // redirect guard
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/restaurant-login', { replace: true });
      return;
    }
  }, [isLoggedIn, navigate]);

  // fetch menu
  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      try {
        await fetchMenu();
      } finally {
        setLoading(false);
      }
    })();
  }, [restaurantId]);

  const fetchMenu = async () => {
    const items = await restaurantAPI.getOwnMenu();
    setMenuItems(Array.isArray(items) ? items : []);
  };

  /** ---------- image upload (client preview as base64) ---------- */
  const handleImageUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      alert('Image size should be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, image: reader.result }));
    reader.readAsDataURL(f);
  };

  /** ---------- add / update submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // small sanitation
    const payload = {
      ...formData,
      price: Number(formData.price)
    };

    try {
      if (editingItem) {
        await restaurantAPI.updateMenuItem(editingItem.id || editingItem._id, payload);
        alert('Menu item updated!');
      } else {
        await restaurantAPI.addMenuItem(payload);
        alert('Menu item added!');
      }
      await fetchMenu();
      handleClose();
    } catch (err) {
      console.error('Save menu item failed:', err);
      alert(err.message || 'Failed to save menu item');
    }
  };

  /** ---------- edit / delete / toggle ---------- */
  const onEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: item.price ?? '',
      category: item.category || 'Main Course',
      image: item.image || '',
      available: item.available !== false
    });
    setShowModal(true);
  };

  const onDelete = async (itemId) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      await restaurantAPI.deleteMenuItem(itemId);
      await fetchMenu();
      alert('Menu item deleted');
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.message || 'Failed to delete');
    }
  };

  const onToggleAvailable = async (item) => {
    try {
      await restaurantAPI.updateMenuItem(item.id || item._id, {
        ...item,
        available: !item.available
      });
      await fetchMenu();
    } catch (err) {
      console.error('Toggle availability failed:', err);
      alert(err.message || 'Failed to update');
    }
  };

  /** ---------- modal helpers ---------- */
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'Main Course',
      image: '',
      available: true
    });
    setShowModal(true);
  };

  const handleClose = () => {
    setEditingItem(null);
    setShowModal(false);
  };

  /** ---------- filtering ---------- */
  const itemsToShow = useMemo(() => {
    if (filterCategory === 'All') return menuItems;
    return menuItems.filter(i => i.category === filterCategory);
  }, [menuItems, filterCategory]);

  if (!isLoggedIn) return null;
  if (loading) return <div className="loading">Loading menu...</div>;

  return (
    <div className="restaurant-menu-page">
      <div className="menu-container">
        <div className="menu-header">
          <div>
            <h1>Menu Management</h1>
            <p>View and update your restaurant menu</p>
          </div>
          <button className="add-item-btn" onClick={handleOpenAdd}>
            ➕ Add Menu Item
          </button>
        </div>

        {/* Category Filter */}
        <div className="category-filter">
          <button
            className={filterCategory === 'All' ? 'active' : ''}
            onClick={() => setFilterCategory('All')}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={filterCategory === cat ? 'active' : ''}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        {itemsToShow.length === 0 ? (
          <div className="no-items">
            <h2>📋 No menu items yet</h2>
            <p>Start building your menu by adding items</p>
          </div>
        ) : (
          <div className="menu-items-grid">
            {itemsToShow.map((item) => (
              <div
                key={item._id}
                className={`menu-item-card ${!item.available ? 'unavailable' : ''}`}
              >
                <div className="item-image">
                  <FoodImage
                    src={item.image}
                    alt={item.name}
                    fallback={resolveMenuItemImage(item)}
                  />
                  {!item.available && <div className="unavailable-badge">Unavailable</div>}
                </div>

                <div className="item-details">
                  <div className="item-header">
                    <h3>{item.name}</h3>
                    <span className="item-category">{item.category}</span>
                  </div>

                  <p className="item-description">{item.description}</p>

                  <div className="item-footer">
                    <span className="item-price">{formatPrice(item.price)}</span>

                    <div className="item-actions">
                      <button
                        className="toggle-btn"
                        title={item.available ? 'Mark as unavailable' : 'Mark as available'}
                        onClick={() => onToggleAvailable(item)}
                      >
                        {item.available ? '✓' : '✗'}
                      </button>

                      <button className="edit-btn" onClick={() => onEdit(item)}>✏️</button>

                      <button className="delete-btn" onClick={() => onDelete(item._id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
                <button className="close-btn" onClick={handleClose}>✕</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Item Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Margherita Pizza"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your dish..."
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Image</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                  {formData.image && (
                    <div className="image-preview">
                      <img src={formData.image} alt="Preview" />
                    </div>
                  )}
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.available}
                      onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    />
                    Available for ordering
                  </label>
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={handleClose}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
