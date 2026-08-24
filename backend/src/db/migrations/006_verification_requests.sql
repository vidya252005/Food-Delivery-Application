-- Restaurant verification submission workflow (Sprint 7).

CREATE TABLE IF NOT EXISTS restaurant_verification_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  criteria        JSONB NOT NULL DEFAULT '[]',
  notes           TEXT,
  status          VARCHAR(32) NOT NULL DEFAULT 'pending',
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES users(id),
  review_notes    TEXT
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_restaurant
  ON restaurant_verification_requests (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status
  ON restaurant_verification_requests (status);
