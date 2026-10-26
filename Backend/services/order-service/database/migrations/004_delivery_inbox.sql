ALTER TABLE order_service.order_inbox ADD COLUMN IF NOT EXISTS payload_hash text;
