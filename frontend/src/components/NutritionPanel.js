import React from 'react';
import { formatDietaryTag } from './QualityBadges';
import './NutritionPanel.css';

export default function NutritionPanel({ item, compact = false }) {
  const nutrition = item?.nutritionProfile;
  const tags = item?.dietaryTags || [];
  const allergens = item?.allergens || [];

  if (!nutrition && tags.length === 0 && allergens.length === 0) return null;

  return (
    <div className={`nutrition-panel ${compact ? 'nutrition-panel--compact' : ''}`}>
      {nutrition && (
        <div className="nutrition-macros">
          {nutrition.calories != null && <span>{nutrition.calories} kcal</span>}
          {nutrition.proteinGrams != null && <span>{nutrition.proteinGrams}g protein</span>}
          {nutrition.carbohydrateGrams != null && <span>{nutrition.carbohydrateGrams}g carbs</span>}
          {nutrition.fatGrams != null && <span>{nutrition.fatGrams}g fat</span>}
          {!compact && nutrition.sugarGrams != null && <span>{nutrition.sugarGrams}g sugar</span>}
        </div>
      )}
      {tags.length > 0 && (
        <div className="dietary-tags">
          {tags.map((t) => (
            <span key={t} className="dietary-tag">{formatDietaryTag(t)}</span>
          ))}
        </div>
      )}
      {!compact && allergens.length > 0 && (
        <p className="allergen-note">
          Contains: {allergens.map((a) => a.replace(/_/g, ' ')).join(', ')}
        </p>
      )}
    </div>
  );
}
