CREATE TABLE IF NOT EXISTS engagement.promotion_reconcile_state (
  key text PRIMARY KEY,
  last_shop_order_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO engagement.promotion_reconcile_state(key)
VALUES ('cancelled_shop_orders') ON CONFLICT(key) DO NOTHING;
