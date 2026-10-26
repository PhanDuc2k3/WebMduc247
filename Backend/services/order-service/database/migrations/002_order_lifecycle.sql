CREATE TABLE IF NOT EXISTS order_service.order_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  currency char(3) NOT NULL DEFAULT 'VND',
  grand_total_minor bigint NOT NULL CHECK (grand_total_minor >= 0),
  current_total_minor bigint NOT NULL DEFAULT 0 CHECK (current_total_minor >= 0),
  cancelled_total_minor bigint NOT NULL DEFAULT 0 CHECK (cancelled_total_minor >= 0),
  status text NOT NULL DEFAULT 'PLACED',
  payment_method text NOT NULL DEFAULT 'COD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(buyer_id,id)
);
ALTER TABLE order_service.orders ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES order_service.order_groups(id);
-- Existing shop orders from checkout v2 are grouped by their original quote.
DO $$
DECLARE r record; gid uuid;
BEGIN
  FOR r IN SELECT quote_id,user_id,sum(payable_total_minor) total,min(created_at) created
    FROM order_service.orders WHERE group_id IS NULL GROUP BY quote_id,user_id LOOP
    INSERT INTO order_service.order_groups(buyer_id,grand_total_minor,current_total_minor,created_at)
      VALUES (r.user_id,r.total,r.total,r.created) RETURNING id INTO gid;
    UPDATE order_service.orders SET group_id=gid WHERE quote_id=r.quote_id AND user_id=r.user_id AND group_id IS NULL;
  END LOOP;
END $$;
ALTER TABLE order_service.orders ALTER COLUMN group_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS order_groups_buyer_created ON order_service.order_groups(buyer_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS shop_orders_store_created ON order_service.orders(store_id,created_at DESC,id DESC);
ALTER TABLE order_service.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE order_service.orders ADD CONSTRAINT orders_status_check CHECK (status IN
  ('PENDING_INVENTORY','PENDING_PAYMENT','PLACED','CONFIRMED','PREPARING','READY_TO_SHIP',
   'SHIPPING','DELIVERED','COMPLETED','CANCEL_PENDING','CANCELLED'));
ALTER TABLE order_service.orders ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;
ALTER TABLE order_service.orders ADD COLUMN IF NOT EXISTS store_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE order_service.orders ADD COLUMN IF NOT EXISTS shipment_ref text;
ALTER TABLE order_service.orders ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE order_service.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE order_service.order_items ADD COLUMN IF NOT EXISTS product_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE order_service.order_items ADD COLUMN IF NOT EXISTS discount_minor bigint NOT NULL DEFAULT 0 CHECK (discount_minor >= 0);
CREATE TABLE IF NOT EXISTS order_service.order_status_history (
  id bigserial PRIMARY KEY,
  shop_order_id uuid NOT NULL REFERENCES order_service.orders(id),
  from_status text,
  to_status text NOT NULL,
  actor_id uuid,
  actor_type text NOT NULL,
  reason text,
  correlation_id text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_status_history_order ON order_service.order_status_history(shop_order_id,id);
CREATE TABLE IF NOT EXISTS order_service.order_commands (
  actor_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  shop_order_id uuid NOT NULL REFERENCES order_service.orders(id),
  result_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(actor_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS order_service.order_inbox (
  source text NOT NULL,
  event_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(source,event_id)
);
ALTER TABLE order_service.order_outbox ADD COLUMN IF NOT EXISTS aggregate_id uuid;
ALTER TABLE order_service.order_outbox ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE order_service.order_outbox ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();
