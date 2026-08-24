import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { foodclubAPI } from '../utils/api';
import './Preferences.css';

const DIETARY_OPTIONS = [
  'vegetarian', 'vegan', 'high_protein', 'gluten_free', 'low_sugar', 'organic', 'whole_food', 'keto',
];

const ALLERGEN_OPTIONS = [
  'milk', 'eggs', 'peanuts', 'tree_nuts', 'soy', 'wheat', 'sesame', 'fish', 'shellfish',
];

export default function Preferences() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState({
    dietaryTags: [],
    allergensToAvoid: [],
    maxCalories: '',
    minProteinGrams: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    foodclubAPI.getPreferences()
      .then((data) => {
        setPrefs({
          dietaryTags: data.dietaryTags || [],
          allergensToAvoid: data.allergensToAvoid || [],
          maxCalories: data.maxCalories ?? '',
          minProteinGrams: data.minProteinGrams ?? '',
        });
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, navigate]);

  const toggle = (key, value) => {
    setPrefs((p) => ({
      ...p,
      [key]: p[key].includes(value)
        ? p[key].filter((v) => v !== value)
        : [...p[key], value],
    }));
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await foodclubAPI.updatePreferences({
        dietaryTags: prefs.dietaryTags,
        allergensToAvoid: prefs.allergensToAvoid,
        maxCalories: prefs.maxCalories ? parseInt(prefs.maxCalories, 10) : null,
        minProteinGrams: prefs.minProteinGrams ? parseInt(prefs.minProteinGrams, 10) : null,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="loading">Loading preferences…</div></div>;

  return (
    <div className="preferences-page">
      <h1>Dietary preferences</h1>
      <p className="prefs-intro">Personalise discovery — we'll use these when you browse curated partners.</p>

      <form onSubmit={handleSave}>
        <section>
          <h2>Dietary focus</h2>
          <div className="pref-chips">
            {DIETARY_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`pref-chip ${prefs.dietaryTags.includes(tag) ? 'active' : ''}`}
                onClick={() => toggle('dietaryTags', tag)}
              >
                {tag.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>Allergens to avoid</h2>
          <div className="pref-chips">
            {ALLERGEN_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                className={`pref-chip ${prefs.allergensToAvoid.includes(a) ? 'active' : ''}`}
                onClick={() => toggle('allergensToAvoid', a)}
              >
                {a.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </section>

        <section className="pref-numbers">
          <label>
            Max calories per dish
            <input
              type="number"
              value={prefs.maxCalories}
              onChange={(e) => { setPrefs({ ...prefs, maxCalories: e.target.value }); setSaved(false); }}
              placeholder="e.g. 600"
            />
          </label>
          <label>
            Min protein (grams)
            <input
              type="number"
              value={prefs.minProteinGrams}
              onChange={(e) => { setPrefs({ ...prefs, minProteinGrams: e.target.value }); setSaved(false); }}
              placeholder="e.g. 30"
            />
          </label>
        </section>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
        {saved && <p className="saved-msg">Preferences saved.</p>}
      </form>
    </div>
  );
}
