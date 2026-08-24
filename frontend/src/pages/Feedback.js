import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Feedback.css';

function Feedback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const order = location.state?.order;

  const [formData, setFormData] = useState({
    rating: '',
    foodQuality: '',
    deliverySpeed: '',
    comment: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!order) navigate('/orders');
  }, [order, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.rating) {
      setError('Please provide an overall rating');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch('http://localhost:5001/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order._id,
          userId: user.id,
          restaurantId: order.restaurant?._id || order.restaurant,
          rating: Number(formData.rating),
          foodQuality: Number(formData.foodQuality),
          deliverySpeed: Number(formData.deliverySpeed),
          comment: formData.comment
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to submit feedback');

      setSuccess(true);
      setTimeout(() => navigate('/orders'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <div className="feedback-page">
      <div className="feedback-container">
        {success ? (
          <div className="success-message">
            <div className="checkmark">✅</div>
            <h2>Thank you for your feedback!</h2>
            <p>Redirecting you back to your orders...</p>
          </div>
        ) : (
          <>
            <button className="back-button" onClick={() => navigate('/orders')}>
              ← Back to Orders
            </button>

            <div className="feedback-header">
              <h1>Rate Your Experience</h1>
              <p className="order-info">
                Order from <strong>{order.restaurant?.name || 'Restaurant'}</strong>
              </p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="feedback-form">
              <div className="rating-section">
                <label>Overall Rating *</label>
                <select
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="1">1 - Terrible</option>
                  <option value="2">2 - Bad</option>
                  <option value="3">3 - Okay</option>
                  <option value="4">4 - Good</option>
                  <option value="5">5 - Excellent</option>
                </select>
              </div>

              <div className="rating-section">
                <label>Food Quality</label>
                <select
                  name="foodQuality"
                  value={formData.foodQuality}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="1">1 - Poor</option>
                  <option value="2">2 - Fair</option>
                  <option value="3">3 - Good</option>
                  <option value="4">4 - Very Good</option>
                  <option value="5">5 - Excellent</option>
                </select>
              </div>

              <div className="rating-section">
                <label>Delivery Speed</label>
                <select
                  name="deliverySpeed"
                  value={formData.deliverySpeed}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="1">1 - Very Slow</option>
                  <option value="2">2 - Slow</option>
                  <option value="3">3 - Average</option>
                  <option value="4">4 - Fast</option>
                  <option value="5">5 - Super Fast</option>
                </select>
              </div>

              <div className="comment-section">
                <label htmlFor="comment">Additional Comments</label>
                <textarea
                  id="comment"
                  name="comment"
                  value={formData.comment}
                  onChange={handleChange}
                  placeholder="Tell us more about your experience..."
                  maxLength={500}
                  rows={5}
                />
                <span className="char-count">{formData.comment.length}/500</span>
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default Feedback;
