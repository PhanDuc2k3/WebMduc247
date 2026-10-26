ALTER TABLE order_service.order_groups ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'UNPAID'
  CHECK (payment_status IN ('UNPAID','PARTIALLY_PAID','PAID','FAILED','PARTIALLY_REFUNDED','REFUNDED'));
ALTER TABLE order_service.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'UNPAID'
  CHECK (payment_status IN ('UNPAID','PAID','FAILED','REFUNDED'));
ALTER TABLE order_service.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE order_service.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('COD','MOMO','VIETQR'));
CREATE TABLE IF NOT EXISTS order_service.payment_inbox (
  event_id text PRIMARY KEY,
  payload_digest text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
