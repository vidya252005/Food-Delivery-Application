import React from 'react';
import { Link } from 'react-router-dom';
import { BENGALURU_AREAS } from '../config/cities';
import './ComingSoon.css';

export default function ComingSoon({ cityLabel, onSelectBengaluru }) {
  return (
    <div className="coming-soon-page">
      <div className="coming-soon-card">
        <span className="coming-soon-icon">🚀</span>
        <h1>Coming to {cityLabel || 'your city'} soon!</h1>
        <p>
          FoodClub is currently live in <strong>Bengaluru</strong> only.
          We&apos;re expanding to more cities — stay tuned.
        </p>
        <div className="coming-soon-areas">
          <p className="coming-soon-label">Order now in Bengaluru:</p>
          <div className="coming-soon-chips">
            {BENGALURU_AREAS.map((area) => (
              <button
                key={area.label}
                type="button"
                className="coming-soon-chip"
                onClick={() => onSelectBengaluru?.(area)}
              >
                {area.label}
              </button>
            ))}
          </div>
        </div>
        <Link to="/" className="btn-primary coming-soon-home">Back to home</Link>
      </div>
    </div>
  );
}
