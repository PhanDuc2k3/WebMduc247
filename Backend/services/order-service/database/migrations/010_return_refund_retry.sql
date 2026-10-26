ALTER TABLE order_service.return_requests ADD COLUMN IF NOT EXISTS refund_attempts integer NOT NULL DEFAULT 0
  CHECK (refund_attempts BETWEEN 0 AND 3);
ALTER TABLE order_service.return_requests ADD COLUMN IF NOT EXISTS last_refund_error text;
