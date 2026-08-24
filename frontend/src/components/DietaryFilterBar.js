import React from 'react';
import './DietaryFilterBar.css';

const DIETARY_OPTIONS = [
  { value: 'high_protein', label: 'High Protein' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'gluten_free', label: 'Gluten Free' },
  { value: 'organic', label: 'Organic' },
  { value: 'low_sugar', label: 'Low Sugar' },
  { value: 'keto', label: 'Keto' },
];

export default function DietaryFilterBar({ filters, onChange }) {
  const toggleTag = (tag) => {
    const next = filters.dietaryTags.includes(tag)
      ? filters.dietaryTags.filter((t) => t !== tag)
      : [...filters.dietaryTags, tag];
    onChange({ ...filters, dietaryTags: next });
  };

  return (
    <div className="dietary-filter-bar">
      <div className="filter-group">
        <div className="filter-chips">
          {DIETARY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filter-chip ${filters.dietaryTags.includes(opt.value) ? 'active' : ''}`}
              onClick={() => toggleTag(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-group filter-row">
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={filters.selectOnly}
            onChange={(e) => onChange({ ...filters, selectOnly: e.target.checked })}
          />
          FoodClub Select only
        </label>
        <label className="filter-select">
          Min quality
          <select
            value={filters.minQualityScore}
            onChange={(e) => onChange({ ...filters, minQualityScore: e.target.value })}
          >
            <option value="">Any</option>
            <option value="85">85+</option>
            <option value="90">90+</option>
            <option value="95">95+</option>
          </select>
        </label>
        <label className="filter-select">
          Max calories (items)
          <select
            value={filters.maxCalories}
            onChange={(e) => onChange({ ...filters, maxCalories: e.target.value })}
          >
            <option value="">Any</option>
            <option value="500">Under 500</option>
            <option value="600">Under 600</option>
            <option value="700">Under 700</option>
          </select>
        </label>
      </div>
    </div>
  );
}
