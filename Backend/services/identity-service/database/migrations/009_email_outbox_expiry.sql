ALTER TABLE identity_email_outbox ADD COLUMN expires_at timestamptz;
ALTER TABLE identity_email_outbox ADD COLUMN discarded_at timestamptz;

-- Pending emails from the former reset-link flow cannot be used by the OTP API.
UPDATE identity_email_outbox SET discarded_at=now()
WHERE purpose='reset_password' AND sent_at IS NULL;
