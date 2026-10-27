ALTER TABLE admin_auth_challenges DROP CONSTRAINT admin_auth_challenges_purpose_check;
ALTER TABLE admin_auth_challenges ADD CONSTRAINT admin_auth_challenges_purpose_check
  CHECK(purpose IN ('login','rotate','passkey_register','passkey_reauth'));
