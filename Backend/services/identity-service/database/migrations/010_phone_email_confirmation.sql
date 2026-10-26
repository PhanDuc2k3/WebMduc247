ALTER TABLE user_profiles ADD COLUMN phone_email_confirmed_at timestamptz;
ALTER TABLE user_profiles DROP CONSTRAINT verified_phone_pair;
ALTER TABLE user_profiles ADD CONSTRAINT phone_confirmation_requires_phone
  CHECK (phone_e164 IS NOT NULL OR (phone_verified_at IS NULL AND phone_email_confirmed_at IS NULL));

-- Earlier development email OTPs were recorded as phone verification even though
-- this project had no configured SMS provider. Preserve their timestamps accurately.
UPDATE user_profiles
SET phone_email_confirmed_at = phone_verified_at, phone_verified_at = NULL
WHERE phone_verified_at IS NOT NULL;

ALTER TABLE phone_challenges ADD COLUMN delivery_channel text NOT NULL DEFAULT 'email'
  CHECK (delivery_channel IN ('email', 'sms'));
