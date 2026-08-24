import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { foodclubAPI } from '../utils/api';
import './NotificationBell.css';

export default function NotificationBell() {
  const { isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    const load = () => {
      setLoading(true);
      foodclubAPI.getNotifications()
        .then(setNotifications)
        .catch(() => setNotifications([]))
        .finally(() => setLoading(false));
    };

    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!isLoggedIn) return null;

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && <span className="notification-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
          </div>
          {loading && notifications.length === 0 ? (
            <p className="notification-empty">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="notification-empty">No notifications yet</p>
          ) : (
            <ul className="notification-list">
              {notifications.slice(0, 8).map((n) => (
                <li key={n.id || n._id} className={`notification-item${n.read ? '' : ' unread'}`}>
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  {n.orderId && (
                    <Link to={`/orders/${n.orderId}/track`} onClick={() => setOpen(false)}>
                      View order →
                    </Link>
                  )}
                  <time>{new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
