-- LLD-aligned schema: payments, deliveries, delivery partners, expanded order lifecycle

-- Expand order status to full lifecycle (migrate legacy values)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

UPDATE orders SET status = CASE status
  WHEN 'pending' THEN 'payment_pending'
  WHEN 'confirmed' THEN 'restaurant_accepted'
  WHEN 'preparing' THEN 'preparing'
  WHEN 'out for delivery' THEN 'out_for_delivery'
  WHEN 'delivered' THEN 'delivered'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE status
END;

ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'created', 'payment_pending', 'confirmed', 'restaurant_accepted',
  'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'
));

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'customer';

CREATE TABLE IF NOT EXISTS delivery_partners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(50),
  password_hash VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'offline'
                  CHECK (status IN ('offline','available','assigned','picked_up','delivering')),
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  rating        NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_partners_status ON delivery_partners (status)
  WHERE status = 'available';

CREATE TABLE IF NOT EXISTS payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id),
  amount_paise     BIGINT NOT NULL,
  currency         VARCHAR(3) NOT NULL DEFAULT 'INR',
  method           VARCHAR(20) NOT NULL
                     CHECK (method IN ('card','upi','wallet','cod')),
  status           VARCHAR(20) NOT NULL DEFAULT 'initiated'
                     CHECK (status IN ('initiated','success','failed','refunded')),
  transaction_id   VARCHAR(255),
  idempotency_key  VARCHAR(255) NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency ON payments (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);

CREATE TABLE IF NOT EXISTS deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL UNIQUE REFERENCES orders(id),
  partner_id      UUID REFERENCES delivery_partners(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','assigned','picked_up','delivering','delivered','cancelled')),
  pickup_lat      DOUBLE PRECISION,
  pickup_lng      DOUBLE PRECISION,
  drop_lat        DOUBLE PRECISION,
  drop_lng        DOUBLE PRECISION,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_partner_id ON deliveries (partner_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries (status);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  order_id   UUID REFERENCES orders(id),
  channel    VARCHAR(20) NOT NULL DEFAULT 'in_app',
  title      VARCHAR(255) NOT NULL,
  body       TEXT,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
