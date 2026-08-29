import React, { useState } from 'react';
import { supportAPI } from '../utils/api';
import './Help.css';

function Help() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    issue: '',
  });
  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');

    try {
      await supportAPI.create(formData);
      setStatus('✅ Your message has been sent. Our team will get back to you soon!');
      setFormData({ name: '', email: '', issue: '' });
    } catch (err) {
      setStatus('❌ Failed to send. Please try again.');
    }
  };

  return (
    <div className="help-page">
      <div className="help-container">
        <h1>Help & Support 💬</h1>
        <p className="intro-text">Need help with your order? We’re always here for you 🍕</p>

        {/* FAQ Section */}
        <section className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <details>
            <summary>How can I cancel my order?</summary>
            <p>Go to “My Orders”, select your order, and click “Cancel Order” before it’s dispatched.</p>
          </details>
          <details>
            <summary>When will I receive my refund?</summary>
            <p>Refunds for prepaid orders are processed within 3–5 business days.</p>
          </details>
          <details>
            <summary>Can I change my delivery address?</summary>
            <p>You can update your address before the restaurant starts preparing your order.</p>
          </details>
          <details>
            <summary>How do I contact the restaurant?</summary>
            <p>Visit the restaurant’s page and click on the “Contact” button to see their phone number or email.</p>
          </details>
        </section>

        {/* Contact Form */}
        <section className="contact-section">
          <h2>Contact Support</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Your name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <textarea
              name="issue"
              placeholder="Describe your issue..."
              value={formData.issue}
              onChange={handleChange}
              rows="5"
              required
            ></textarea>
            <button type="submit">Send Message</button>
          </form>
          {status && <p className="status-message">{status}</p>}
        </section>
      </div>
    </div>
  );
}

export default Help;
