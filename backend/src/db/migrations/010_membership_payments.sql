-- Allow membership subscription charges without an order row.
ALTER TABLE payments
  ALTER COLUMN order_id DROP NOT NULL;
