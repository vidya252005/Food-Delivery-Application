-- 004_foodclub_schema.sql
-- FoodClub curated marketplace: quality profiles, verification, nutrition, membership.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS supported_dietary_tags TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS quality_profiles (
  restaurant_id       UUID PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  overall_score       SMALLINT NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  ingredient_score    SMALLINT NOT NULL DEFAULT 0 CHECK (ingredient_score BETWEEN 0 AND 100),
  transparency_score  SMALLINT NOT NULL DEFAULT 0 CHECK (transparency_score BETWEEN 0 AND 100),
  food_safety_score   SMALLINT NOT NULL DEFAULT 0 CHECK (food_safety_score BETWEEN 0 AND 100),
  consistency_score   SMALLINT NOT NULL DEFAULT 0 CHECK (consistency_score BETWEEN 0 AND 100),
  badges              TEXT[] NOT NULL DEFAULT '{}',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_verification ON restaurants (verification_status);

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS calories INTEGER,
  ADD COLUMN IF NOT EXISTS protein_g NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS carbs_g NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS fat_g NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS sugar_g NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS fiber_g NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allergens TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prep_time_minutes SMALLINT;

CREATE TABLE IF NOT EXISTS customer_dietary_preferences (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  dietary_tags         TEXT[] NOT NULL DEFAULT '{}',
  allergens_to_avoid   TEXT[] NOT NULL DEFAULT '{}',
  max_calories         INTEGER,
  min_protein_g        INTEGER,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier         VARCHAR(32) NOT NULL DEFAULT 'basic',
  status       VARCHAR(32) NOT NULL DEFAULT 'active',
  start_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_user_active
  ON memberships (user_id) WHERE status = 'active';
