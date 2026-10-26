CREATE TABLE IF NOT EXISTS catalog.inventory_order_restocks (
  cancellation_key text PRIMARY KEY,
  reservation_ids uuid[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
