ALTER TABLE identity_outbox ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE identity_outbox ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE identity_outbox ADD COLUMN IF NOT EXISTS dead_letter_at timestamptz;
ALTER TABLE identity_outbox ADD COLUMN IF NOT EXISTS last_error text;
CREATE INDEX IF NOT EXISTS identity_outbox_pending_idx ON identity_outbox(next_attempt_at,id)
  WHERE published_at IS NULL AND dead_letter_at IS NULL;
