ALTER TABLE order_service.orders ADD COLUMN IF NOT EXISTS refunded_minor bigint NOT NULL DEFAULT 0
  CHECK (refunded_minor >= 0 AND refunded_minor <= payable_total_minor);
