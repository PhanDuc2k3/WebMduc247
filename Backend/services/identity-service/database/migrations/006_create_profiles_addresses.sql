CREATE TABLE user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 120),
  avatar_key text,
  phone_e164 text,
  phone_verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verified_phone_pair CHECK ((phone_e164 IS NULL) = (phone_verified_at IS NULL))
);
CREATE UNIQUE INDEX user_profiles_verified_phone_unique ON user_profiles(phone_e164) WHERE phone_e164 IS NOT NULL;

CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE phone_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL,
  code_hash char(64) NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX phone_challenges_user_idx ON phone_challenges(user_id, created_at DESC);

CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_name text NOT NULL,
  receiver_phone text NOT NULL,
  province_code text NOT NULL,
  district_code text NOT NULL,
  ward_code text NOT NULL,
  address_line text NOT NULL,
  note text,
  is_default boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX addresses_user_active_idx ON addresses(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX addresses_one_default_per_user ON addresses(user_id) WHERE is_default AND deleted_at IS NULL;

INSERT INTO user_profiles(user_id,display_name) SELECT id,full_name FROM users ON CONFLICT DO NOTHING;
INSERT INTO user_preferences(user_id) SELECT id FROM users ON CONFLICT DO NOTHING;
