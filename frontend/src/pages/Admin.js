import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../utils/api';
import QualityBadges from '../components/QualityBadges';
import './Admin.css';

const CRITERION_LABELS = {
  food_safety: 'Food safety',
  ingredient_transparency: 'Ingredient transparency',
  nutrition_info: 'Nutrition info',
  kitchen_hygiene: 'Kitchen hygiene',
  quality_audit: 'Quality audit',
};

export default function AdminDashboard() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@foodclub.in');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviewNotes, setReviewNotes] = useState({});

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.listPending();
      setPending(data);
      setAuthenticated(true);
    } catch (err) {
      setError(err.message);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role === 'admin') {
      loadPending();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminAPI.login({ email, password });
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('role', 'admin');
      login(res.data.user, res.token, 'admin');
      await loadPending();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id) => {
    await adminAPI.verify(id, reviewNotes[id] || 'Approved — meets FoodClub quality standards.');
    loadPending();
  };

  const handleReject = async (id) => {
    const note = reviewNotes[id] || 'Please resubmit with complete documentation.';
    await adminAPI.reject(id, note);
    loadPending();
  };

  if (!authenticated) {
    return (
      <div className="admin-page">
        <div className="admin-login-card">
          <h1>FoodClub Admin</h1>
          <p>Restaurant verification portal</p>
          {error && <p className="admin-error">{error}</p>}
          <form onSubmit={handleLogin}>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Restaurant verification queue</h1>
        <Link to="/" className="btn-secondary">Back</Link>
      </header>
      {loading ? (
        <p>Loading…</p>
      ) : pending.length === 0 ? (
        <p className="admin-empty">No restaurants pending verification.</p>
      ) : (
        <ul className="admin-list">
          {pending.map((r) => (
            <li key={r.id} className="admin-list-item">
              <div className="admin-list-body">
                <h3>{r.name}</h3>
                <p>{r.description}</p>
                <p className="admin-city">{r.city || 'Bengaluru'} · Quality score: {r.qualityScore ?? '—'}</p>
                <QualityBadges restaurant={r} compact />
                <span className="admin-status">Status: {r.verificationStatus}</span>

                {r.request?.criteria?.length > 0 && (
                  <div className="admin-evidence">
                    <strong>Submitted evidence:</strong>
                    <ul>
                      {r.request.criteria.map((c) => (
                        <li key={c.type}>
                          {CRITERION_LABELS[c.type] || c.type}:{' '}
                          <a href={c.evidenceUrl} target="_blank" rel="noreferrer">{c.evidenceUrl}</a>
                        </li>
                      ))}
                    </ul>
                    {r.request.notes && <p className="admin-request-notes">Partner notes: {r.request.notes}</p>}
                  </div>
                )}

                <textarea
                  className="admin-review-input"
                  placeholder="Review notes (optional)"
                  value={reviewNotes[r.id] || ''}
                  onChange={(e) => setReviewNotes({ ...reviewNotes, [r.id]: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="admin-actions">
                <button type="button" className="btn-primary" onClick={() => handleVerify(r.id)}>Verify</button>
                <button type="button" className="btn-secondary" onClick={() => handleReject(r.id)}>Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
