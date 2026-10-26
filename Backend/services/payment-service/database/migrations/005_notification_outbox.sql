ALTER TABLE payment_service.payment_outbox ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;
ALTER TABLE payment_service.payment_outbox ADD COLUMN IF NOT EXISTS notification_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE payment_service.payment_outbox ADD COLUMN IF NOT EXISTS next_notification_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE payment_service.payment_outbox ADD COLUMN IF NOT EXISTS notification_dead_at timestamptz;
-- Do not send old payment events as fresh notifications at rollout.
UPDATE payment_service.payment_outbox SET notification_sent_at=now() WHERE notification_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS payment_notification_pending ON payment_service.payment_outbox(next_notification_at,id)
  WHERE notification_sent_at IS NULL AND notification_dead_at IS NULL;
