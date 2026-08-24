import React from 'react';
import './QualityBadges.css';

const BADGE_LABELS = {
  verified_restaurant: { label: 'Verified', icon: '✓', className: 'verified' },
  nutrition_info_available: { label: 'Nutrition Info', icon: '📊', className: 'nutrition' },
  vegetarian_friendly: { label: 'Veg Friendly', icon: '🥬', className: 'vegetarian' },
  high_protein_options: { label: 'High Protein', icon: '💪', className: 'protein' },
  organic_options: { label: 'Organic', icon: '🌿', className: 'organic' },
  chef_curated: { label: "Chef's Choice", icon: '👨‍🍳', className: 'nutrition' },
  select_eligible: { label: 'Select', icon: '✦', className: 'select' },
};

const DIETARY_LABELS = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  high_protein: 'High Protein',
  gluten_free: 'Gluten Free',
  low_sugar: 'Low Sugar',
  organic: 'Organic',
  whole_food: 'Whole Food',
  keto: 'Keto',
};

export function formatDietaryTag(tag) {
  return DIETARY_LABELS[tag] || tag.replace(/_/g, ' ');
}

export default function QualityBadges({ restaurant, compact = false }) {
  const profile = restaurant?.qualityProfile;
  const badges = profile?.badges || [];
  const score = profile?.overallScore ?? restaurant?.qualityScore;
  const exceptional = score != null && score >= 90;

  if (!score && badges.length === 0 && !restaurant?.selectEligible) return null;

  return (
    <div className={`quality-badges ${compact ? 'quality-badges--compact' : ''}`}>
      {score != null && (
        <span
          className={`quality-score${exceptional ? ' quality-score--exceptional' : ''}`}
          title="FoodClub Quality Score"
        >
          {compact ? `${score}` : `Quality ${score}/100`}
        </span>
      )}
      {restaurant?.verificationStatus === 'verified' && !badges.includes('verified_restaurant') && (
        <span className="quality-badge verified">✓ Verified</span>
      )}
      {badges.map((b) => {
        const meta = BADGE_LABELS[b];
        if (!meta) return null;
        return (
          <span key={b} className={`quality-badge ${meta.className}`}>
            {meta.icon} {meta.label}
          </span>
        );
      })}
      {restaurant?.selectEligible && !badges.includes('select_eligible') && (
        <span className="quality-badge select">✦ Select</span>
      )}
    </div>
  );
}

export function QualityScoreBreakdown({ profile }) {
  if (!profile) return null;
  const exceptional = profile.overallScore >= 90;
  const rows = [
    ['Ingredients', profile.ingredientScore],
    ['Transparency', profile.transparencyScore],
    ['Food Safety', profile.foodSafetyScore],
    ['Consistency', profile.consistencyScore],
  ];
  return (
    <div className="quality-breakdown">
      <h4>FoodClub Quality Profile</h4>
      <div className={`quality-overall${exceptional ? ' quality-overall--exceptional' : ''}`}>
        {profile.overallScore}<span>/100</span>
      </div>
      <ul>
        {rows.map(([label, value]) => (
          <li key={label}>
            <span>{label}</span>
            <span className="quality-bar-wrap">
              <span className="quality-bar" style={{ width: `${value}%` }} />
            </span>
            <span>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
