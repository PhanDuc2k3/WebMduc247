CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS catalog;

CREATE TABLE IF NOT EXISTS catalog.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 60),
  name text NOT NULL CHECK (length(name) BETWEEN 3 AND 120),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  logo_url text,
  banner_url text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stores_public_lookup ON catalog.stores (status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS stores_search_name ON catalog.stores (lower(name));

CREATE TABLE IF NOT EXISTS catalog.store_members (
  store_id uuid NOT NULL REFERENCES catalog.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'staff')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, user_id)
);
CREATE INDEX IF NOT EXISTS store_members_by_user ON catalog.store_members (user_id, status);

CREATE TABLE IF NOT EXISTS catalog.store_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES catalog.stores(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_invitations_by_store ON catalog.store_invitations (store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS catalog.store_addresses (
  store_id uuid PRIMARY KEY REFERENCES catalog.stores(id) ON DELETE CASCADE,
  pickup_address text NOT NULL,
  return_address text NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog.store_settings (
  store_id uuid PRIMARY KEY REFERENCES catalog.stores(id) ON DELETE CASCADE,
  accepting_orders boolean NOT NULL DEFAULT true,
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact_info jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS catalog.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES catalog.stores(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 3 AND 200),
  description text NOT NULL DEFAULT '',
  price numeric(14,2) NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_public_by_store ON catalog.products (store_id, status, created_at DESC);
CREATE TABLE IF NOT EXISTS catalog.store_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES catalog.stores(id),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  changed_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS catalog.store_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
