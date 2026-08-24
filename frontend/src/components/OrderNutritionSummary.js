import React from 'react';
import NutritionPanel from './NutritionPanel';
import './OrderNutritionSummary.css';

export default function OrderNutritionSummary({ order, compact = false }) {
  const summary = order?.nutritionSummary;
  const items = order?.items || [];
  const hasItemNutrition = items.some((item) => item.nutritionProfile);

  if (!summary && !hasItemNutrition) return null;

  return (
    <div className={`order-nutrition ${compact ? 'order-nutrition--compact' : ''}`}>
      {summary && (
        <div className="order-nutrition-total">
          <span className="order-nutrition-label">Meal nutrition (at order time)</span>
          <div className="order-nutrition-macros">
            <strong>{summary.calories} kcal</strong>
            <span>{summary.proteinGrams}g protein</span>
            <span>{summary.carbohydrateGrams}g carbs</span>
            <span>{summary.fatGrams}g fat</span>
          </div>
        </div>
      )}
      {!compact && hasItemNutrition && (
        <ul className="order-nutrition-items">
          {items.map((item) => (
            <li key={item.id || item._id || item.name}>
              <span className="order-nutrition-item-name">
                {item.name} × {item.quantity}
              </span>
              <NutritionPanel item={item} compact />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
