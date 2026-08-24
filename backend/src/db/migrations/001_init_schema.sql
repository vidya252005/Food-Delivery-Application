-- 001_init_schema.sql
-- Initial relational schema for the food delivery platform.
-- Replaces the previous MongoDB/Mongoose document model with normalized
-- Postgres tables, explicit foreign keys, and B-tree indexes on every
-- foreign key and every column used in a WHERE/ORDER BY in the API layer.
--
-- gen_random_uuid() ships in Postgres core since v13 (pgcrypto no longer
-- required), so no CREATE EXTENSION is needed here.

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  street        VARCHAR(255),
  city          VARCHAR(255),
  state         VARCHAR(255),
  zip_code      VARCHAR(20),
  phone         VARCHAR(50),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B-tree unique index: backs both the uniqueness constraint and every
-- login/registration lookup (`WHERE email = $1`).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS restaurants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  cuisine       TEXT[] NOT NULL DEFAULT '{}',
  street        VARCHAR(255),
  city          VARCHAR(255),
  state         VARCHAR(255),
  zip_code      VARCHAR(20),
  phone         VARCHAR(50),
  image         TEXT,
  delivery_time VARCHAR(50) NOT NULL DEFAULT '30-45 min',
  min_order     NUMERIC(10,2) NOT NULL DEFAULT 0,
  rating        NUMERIC(2,1) NOT NULL DEFAULT 4.0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_email ON restaurants (email);
-- Backs "GET /api/restaurants" (`WHERE is_active = true`).
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants (is_active);
-- Backs the prefix/ILIKE search endpoint.
CREATE INDEX IF NOT EXISTS idx_restaurants_name ON restaurants (name);

CREATE TABLE IF NOT EXISTS menu_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL,
  category      VARCHAR(100),
  image         TEXT,
  available     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backs every "menu for restaurant X" lookup - this is the FK Mongo gave
-- us for free by embedding; in Postgres it must be indexed explicitly.
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_name ON menu_items (name);

CREATE TABLE IF NOT EXISTS orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  restaurant_id  UUID NOT NULL REFERENCES restaurants(id),
  total_amount   NUMERIC(10,2) NOT NULL,
  street         VARCHAR(255),
  city           VARCHAR(255),
  state          VARCHAR(255),
  zip_code       VARCHAR(20),
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','preparing','out for delivery','delivered','cancelled')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (payment_status IN ('pending','completed','failed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The two hottest read paths in the API: "my orders" and "restaurant's orders".
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders (restaurant_id);
-- Composite index for the restaurant dashboard's "active orders" filter
-- (WHERE restaurant_id = $1 AND status = ANY($2)).
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders (restaurant_id, status);
-- Every order listing is ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id  UUID REFERENCES menu_items(id),
  name          VARCHAR(255) NOT NULL,
  price         NUMERIC(10,2) NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

CREATE TABLE IF NOT EXISTS feedback (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id),
  user_id        UUID NOT NULL REFERENCES users(id),
  restaurant_id  UUID NOT NULL REFERENCES restaurants(id),
  rating         SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  food_quality   SMALLINT CHECK (food_quality BETWEEN 1 AND 5),
  delivery_speed SMALLINT CHECK (delivery_speed BETWEEN 1 AND 5),
  comment        VARCHAR(500),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UNIQUE doubles as the "one feedback per order" business rule *and* the
-- index that makes the existing-feedback check O(log n) instead of a scan.
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_order_id ON feedback (order_id);
CREATE INDEX IF NOT EXISTS idx_feedback_restaurant_id ON feedback (restaurant_id);

CREATE TABLE IF NOT EXISTS support_tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  issue      TEXT NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets (created_at DESC);
