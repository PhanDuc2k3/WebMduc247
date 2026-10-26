CREATE SCHEMA IF NOT EXISTS payment_service;
CREATE SEQUENCE IF NOT EXISTS payment_service.vietqr_order_code START 100000;
CREATE TABLE IF NOT EXISTS payment_service.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_group_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  method text NOT NULL CHECK (method IN ('COD','MOMO','VIETQR')),
  provider text NOT NULL,
  provider_order_ref text UNIQUE,
  provider_request_id text UNIQUE,
  provider_order_code bigint UNIQUE,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency char(3) NOT NULL DEFAULT 'VND' CHECK (currency='VND'),
  status text NOT NULL CHECK (status IN
    ('INITIATED','PENDING','SUCCEEDED','FAILED','EXPIRED','REFUNDED','PARTIALLY_REFUNDED','UNPAID')),
  checkout_url text,
  qr_data text,
  expires_at timestamptz,
  idempotency_key text,
  request_hash text,
  version bigint NOT NULL DEFAULT 1,
  last_reconciled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_group_id,method),
  UNIQUE(buyer_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS payment_intents_pending ON payment_service.payment_intents(status,expires_at);
CREATE TABLE IF NOT EXISTS payment_service.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL REFERENCES payment_service.payment_intents(id),
  provider text NOT NULL,
  provider_txn_id text,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency char(3) NOT NULL DEFAULT 'VND',
  status text NOT NULL CHECK (status IN ('SUCCEEDED','FAILED')),
  verified_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  payload_digest text NOT NULL,
  UNIQUE(provider,provider_txn_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_one_success ON payment_service.payment_transactions(intent_id)
  WHERE status='SUCCEEDED';
CREATE TABLE IF NOT EXISTS payment_service.payment_webhook_inbox (
  provider text NOT NULL,
  delivery_id text NOT NULL,
  payload_digest text NOT NULL,
  signature_valid boolean NOT NULL,
  outcome text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider,delivery_id)
);
CREATE TABLE IF NOT EXISTS payment_service.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_order_id uuid NOT NULL,
  payment_intent_id uuid NOT NULL REFERENCES payment_service.payment_intents(id),
  provider text NOT NULL,
  provider_refund_ref text NOT NULL UNIQUE,
  provider_refund_txn_id text,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  status text NOT NULL CHECK (status IN ('INITIATED','PENDING','SUCCEEDED','FAILED')),
  reason text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_order_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS payment_service.payment_outbox (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE TABLE IF NOT EXISTS payment_service.payment_reconciliation (
  id bigserial PRIMARY KEY,
  intent_id uuid NOT NULL REFERENCES payment_service.payment_intents(id),
  observed_status text,
  local_status text NOT NULL,
  outcome text NOT NULL,
  details text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
