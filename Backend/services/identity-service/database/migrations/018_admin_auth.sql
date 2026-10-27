ALTER TABLE users ADD COLUMN security_version bigint NOT NULL DEFAULT 0;
CREATE TABLE admin_mfa_factors (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret jsonb NOT NULL, last_counter bigint NOT NULL DEFAULT -1,
  version integer NOT NULL DEFAULT 1, disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE admin_recovery_codes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,code_hash)
);
CREATE TABLE admin_auth_challenges (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK(purpose IN ('login','rotate','passkey_register')),
  family_id uuid, security_version bigint NOT NULL, access_version bigint NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}', attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_auth_challenges_user ON admin_auth_challenges(user_id,expires_at);
CREATE TABLE admin_sessions (
  family_id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  factor_version integer NOT NULL, method text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(), reauthenticated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL, device_hash text NOT NULL, device text, ip inet
);
CREATE INDEX admin_sessions_user ON admin_sessions(user_id,expires_at);
CREATE TABLE admin_known_devices (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, device_hash text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,device_hash)
);
CREATE TABLE admin_mfa_recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evidence_reference text NOT NULL, reason text NOT NULL, review_evidence_reference text, review_reason text,
  status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','APPROVED','REJECTED','EXECUTED')),
  reviewed_by uuid, security_version bigint NOT NULL, access_version bigint NOT NULL,
  version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, executed_at timestamptz,
  CHECK(reviewed_by IS NULL OR reviewed_by<>user_id)
);
CREATE UNIQUE INDEX admin_mfa_one_pending_recovery ON admin_mfa_recovery_requests(user_id) WHERE status IN ('REQUESTED','APPROVED');
CREATE TABLE admin_passkeys (
  id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key bytea NOT NULL, counter bigint NOT NULL DEFAULT 0, transports jsonb NOT NULL DEFAULT '[]',
  label text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz
);
ALTER TABLE identity_email_outbox DROP CONSTRAINT identity_email_outbox_purpose_check;
ALTER TABLE identity_email_outbox ADD CONSTRAINT identity_email_outbox_purpose_check CHECK(purpose IN ('verify_email','reset_password','security_notice'));
ALTER TABLE security_events ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}';
CREATE FUNCTION revoke_sessions_on_password_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    NEW.security_version=OLD.security_version+1;
    UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=OLD.id AND revoked_at IS NULL;
    UPDATE admin_auth_challenges SET consumed_at=now() WHERE user_id=OLD.id AND consumed_at IS NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER revoke_sessions_on_password_change BEFORE UPDATE OF password_hash ON users
  FOR EACH ROW EXECUTE FUNCTION revoke_sessions_on_password_change();
-- Existing administrator sessions must sign in through MFA; ordinary users are unaffected.
UPDATE refresh_sessions SET revoked_at=now() WHERE revoked_at IS NULL AND user_id IN
  (SELECT user_id FROM user_roles WHERE role='platform_admin');
