-- Email-confirmed numbers are account contact details, not proof of ownership.
-- They must not reserve a phone number against its actual owner.
DROP INDEX user_profiles_verified_phone_unique;
CREATE UNIQUE INDEX user_profiles_verified_phone_unique
  ON user_profiles(phone_e164) WHERE phone_verified_at IS NOT NULL;
