CREATE TABLE IF NOT EXISTS engagement.promotion_reserve_requests (
  order_ref text PRIMARY KEY,
  user_id uuid NOT NULL,
  request_hash text NOT NULL,
  result_json jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE','COMMITTED','RELEASED','EXPIRED')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS promotion_reserve_expiry
  ON engagement.promotion_reserve_requests(status,expires_at);
