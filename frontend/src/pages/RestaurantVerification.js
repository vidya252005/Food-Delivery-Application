import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../context/RestaurantContext';
import { restaurantAPI } from '../utils/api';
import './RestaurantVerification.css';

const CRITERION_LABELS = {
  food_safety: 'Food safety documentation',
  ingredient_transparency: 'Ingredient transparency',
  nutrition_info: 'Nutrition information availability',
  kitchen_hygiene: 'Kitchen hygiene verification',
  quality_audit: 'Quality audit report',
};

const EMPTY_CRITERIA = Object.keys(CRITERION_LABELS).map((type) => ({
  type,
  evidenceUrl: '',
  passed: false,
}));

export default function RestaurantVerification() {
  const { isLoggedIn } = useRestaurant();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [criteria, setCriteria] = useState(EMPTY_CRITERIA);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/restaurant-login');
      return;
    }
    loadStatus();
  }, [isLoggedIn, navigate]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await restaurantAPI.getVerificationStatus();
      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateCriterion = (type, field, value) => {
    setCriteria((prev) => prev.map((c) => (
      c.type === type ? { ...c, [field]: value } : c
    )));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const selected = criteria.filter((c) => c.passed && c.evidenceUrl.trim());
    if (selected.length === 0) {
      setError('Select at least one criterion and provide an evidence URL for each.');
      return;
    }
    setSubmitting(true);
    try {
      await restaurantAPI.submitVerification({
        criteria: selected.map(({ type, evidenceUrl }) => ({ type, evidenceUrl: evidenceUrl.trim() })),
        notes: notes.trim() || undefined,
      });
      setSuccess('Verification request submitted! Our team will review within 2–3 business days.');
      await loadStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="loading">Loading verification status…</div></div>;
  }

  const verified = status?.verificationStatus === 'verified';
  const pendingReview = status?.latestRequest?.status === 'pending';
  const canSubmit = !verified && !pendingReview;

  return (
    <div className="verification-page">
      <header className="verification-header">
        <h1>FoodClub Quality Verification</h1>
        <p>Submit evidence to earn your Verified badge and become Select-eligible (quality score 90+).</p>
      </header>

      <div className={`verification-status-banner status-${status?.verificationStatus || 'pending'}`}>
        <strong>Current status:</strong> {(status?.verificationStatus || 'pending').replace(/_/g, ' ')}
        {status?.latestRequest && (
          <span className="request-meta">
            Last submitted: {new Date(status.latestRequest.submittedAt).toLocaleDateString()}
            {' · '}Request: {status.latestRequest.status}
          </span>
        )}
      </div>

      {verified && (
        <p className="verified-message">✓ Your restaurant is verified on FoodClub. Maintain quality standards to keep your badge.</p>
      )}

      {pendingReview && (
        <p className="pending-message">Your verification request is under admin review. We&apos;ll notify you once complete.</p>
      )}

      {status?.latestRequest?.reviewNotes && (
        <div className="review-notes">
          <strong>Admin feedback:</strong> {status.latestRequest.reviewNotes}
        </div>
      )}

      {error && <p className="verification-error">{error}</p>}
      {success && <p className="verification-success">{success}</p>}

      {canSubmit && (
        <form className="verification-form" onSubmit={handleSubmit}>
          <h2>Submit verification evidence</h2>
          <p className="form-hint">
            For each criterion you meet, paste a link to your documentation (Google Drive, FSSAI certificate URL, menu nutrition sheet, etc.).
          </p>

          {criteria.map((c) => (
            <div key={c.type} className="criterion-block">
              <label className="criterion-check">
                <input
                  type="checkbox"
                  checked={c.passed}
                  onChange={(e) => updateCriterion(c.type, 'passed', e.target.checked)}
                />
                {CRITERION_LABELS[c.type]}
              </label>
              {c.passed && (
                <input
                  type="url"
                  placeholder="Evidence URL (required)"
                  value={c.evidenceUrl}
                  onChange={(e) => updateCriterion(c.type, 'evidenceUrl', e.target.value)}
                  className="evidence-input"
                />
              )}
            </div>
          ))}

          <label className="notes-label">
            Additional notes for the review team
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context about your sourcing, certifications, or kitchen practices…"
              rows={3}
            />
          </label>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for verification'}
          </button>
        </form>
      )}
    </div>
  );
}
