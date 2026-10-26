CREATE TABLE IF NOT EXISTS catalog.inventory (
  variant_id uuid PRIMARY KEY REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  on_hand integer NOT NULL CHECK (on_hand >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_reserved_within_stock CHECK (reserved <= on_hand)
);
INSERT INTO catalog.inventory(variant_id,on_hand,reserved)
SELECT id,stock,0 FROM catalog.product_variants
ON CONFLICT (variant_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS catalog.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  order_ref text NOT NULL CHECK (length(order_ref) BETWEEN 1 AND 120),
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMMITTED','RELEASED','EXPIRED')),
  expires_at timestamptz NOT NULL,
  idempotency_key text NOT NULL UNIQUE CHECK (length(idempotency_key) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_reservations_expiry ON catalog.inventory_reservations(expires_at,variant_id)
  WHERE status='ACTIVE';
CREATE INDEX IF NOT EXISTS inventory_reservations_order ON catalog.inventory_reservations(order_ref);

CREATE TABLE IF NOT EXISTS catalog.inventory_movements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  variant_id uuid NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  delta integer NOT NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 300),
  reference text,
  actor_id uuid,
  source text NOT NULL CHECK (source IN ('seller','reservation','reconciliation','seed','catalog')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_movements_history ON catalog.inventory_movements(variant_id,occurred_at DESC,id DESC);

CREATE TABLE IF NOT EXISTS catalog.inventory_anomalies (
  variant_id uuid PRIMARY KEY REFERENCES catalog.product_variants(id) ON DELETE CASCADE,
  issue text NOT NULL,
  observed_on_hand integer NOT NULL,
  observed_reserved integer NOT NULL,
  expected_reserved integer NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
