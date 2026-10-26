ALTER TABLE order_service.order_groups ADD COLUMN IF NOT EXISTS current_total_minor bigint NOT NULL DEFAULT 0 CHECK (current_total_minor >= 0);
ALTER TABLE order_service.order_groups ADD COLUMN IF NOT EXISTS cancelled_total_minor bigint NOT NULL DEFAULT 0 CHECK (cancelled_total_minor >= 0);
UPDATE order_service.order_groups SET current_total_minor=grand_total_minor
WHERE current_total_minor=0 AND cancelled_total_minor=0;
