CREATE TABLE identity_email_outbox (
  id bigserial PRIMARY KEY,
  recipient text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  nonce bytea NOT NULL,
  ciphertext bytea NOT NULL,
  tag bytea NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX identity_email_outbox_pending_idx ON identity_email_outbox (next_attempt_at) WHERE sent_at IS NULL AND attempts < 10;
