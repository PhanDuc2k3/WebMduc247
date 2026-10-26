DROP INDEX IF EXISTS payment_service.payment_one_success;
CREATE UNIQUE INDEX IF NOT EXISTS payment_online_one_success ON payment_service.payment_transactions(intent_id)
  WHERE status='SUCCEEDED' AND provider<>'DELIVERY';
CREATE TABLE IF NOT EXISTS payment_service.cod_collections (
  shop_order_id uuid PRIMARY KEY,
  intent_id uuid NOT NULL REFERENCES payment_service.payment_intents(id),
  transaction_id uuid NOT NULL UNIQUE REFERENCES payment_service.payment_transactions(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
