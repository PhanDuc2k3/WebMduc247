ALTER TABLE order_service.order_outbox ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;
ALTER TABLE order_service.order_outbox ADD COLUMN IF NOT EXISTS notification_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE order_service.order_outbox ADD COLUMN IF NOT EXISTS next_notification_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE order_service.order_outbox ADD COLUMN IF NOT EXISTS notification_dead_at timestamptz;
-- Do not deliver historic orders as newly created notifications at rollout.
UPDATE order_service.order_outbox SET notification_sent_at=now() WHERE notification_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS order_notification_pending ON order_service.order_outbox(next_notification_at,id)
  WHERE notification_sent_at IS NULL AND notification_dead_at IS NULL;
