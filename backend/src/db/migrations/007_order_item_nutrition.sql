-- Snapshot menu nutrition on order line items so order history reflects values at purchase time.

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS calories INTEGER,
  ADD COLUMN IF NOT EXISTS protein_g NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS carbs_g NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS fat_g NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS sugar_g NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS fiber_g NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';

-- Backfill existing line items from current menu data where possible.
UPDATE order_items oi
SET
  calories = mi.calories,
  protein_g = mi.protein_g,
  carbs_g = mi.carbs_g,
  fat_g = mi.fat_g,
  sugar_g = mi.sugar_g,
  fiber_g = mi.fiber_g,
  dietary_tags = COALESCE(mi.dietary_tags, '{}'),
  allergens = COALESCE(mi.allergens, '{}')
FROM menu_items mi
WHERE oi.menu_item_id = mi.id
  AND oi.calories IS NULL;
