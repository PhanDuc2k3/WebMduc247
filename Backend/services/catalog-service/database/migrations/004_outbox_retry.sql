ALTER TABLE catalog.store_outbox ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE catalog.store_outbox ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE catalog.store_outbox ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE catalog.store_outbox ADD COLUMN IF NOT EXISTS dead_letter_at timestamptz;
CREATE INDEX IF NOT EXISTS store_outbox_retry ON catalog.store_outbox(next_attempt_at,id)
  WHERE published_at IS NULL AND dead_letter_at IS NULL;
