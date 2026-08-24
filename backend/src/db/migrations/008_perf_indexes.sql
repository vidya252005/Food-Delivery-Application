-- Query-plan helpers for Bengaluru discovery & category browse.

CREATE INDEX IF NOT EXISTS idx_restaurants_city_active
  ON restaurants (city, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_menu_items_category
  ON menu_items (category);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_category
  ON menu_items (restaurant_id, category);

CREATE INDEX IF NOT EXISTS idx_quality_profiles_score
  ON quality_profiles (overall_score DESC);
