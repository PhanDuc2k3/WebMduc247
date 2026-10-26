CREATE SCHEMA IF NOT EXISTS order_service;
CREATE TABLE IF NOT EXISTS order_service.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  version bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_service.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES order_service.carts(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  selected boolean NOT NULL DEFAULT true,
  observed_price_minor bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cart_id,variant_id)
);
CREATE TABLE IF NOT EXISTS order_service.checkout_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cart_version bigint NOT NULL,
  address_id uuid,
  quote_json jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PLACED','EXPIRED')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkout_quotes_user ON order_service.checkout_quotes(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS order_service.checkout_idempotency (
  user_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  result_ref jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 day',
  PRIMARY KEY(user_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS order_service.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  quote_id uuid NOT NULL REFERENCES order_service.checkout_quotes(id),
  status text NOT NULL DEFAULT 'PENDING_INVENTORY' CHECK (status IN ('PENDING_INVENTORY','CONFIRMED','CANCELLED')),
  payment_method text NOT NULL CHECK (payment_method IN ('COD')),
  currency text NOT NULL DEFAULT 'VND',
  subtotal_minor bigint NOT NULL CHECK (subtotal_minor >= 0),
  discount_minor bigint NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  shipping_estimate_minor bigint NOT NULL CHECK (shipping_estimate_minor >= 0),
  payable_total_minor bigint NOT NULL CHECK (payable_total_minor >= 0),
  shipping_address_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_service.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES order_service.orders(id),
  variant_id uuid NOT NULL,
  product_id uuid NOT NULL,
  sku text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
  line_total_minor bigint NOT NULL CHECK (line_total_minor >= 0),
  reservation_id uuid NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS order_service.order_outbox (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
