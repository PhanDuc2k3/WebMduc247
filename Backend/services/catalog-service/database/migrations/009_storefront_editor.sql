CREATE TABLE catalog.storefront_settings (
  id smallint PRIMARY KEY CHECK(id=1),
  draft jsonb,
  published jsonb,
  version bigint NOT NULL DEFAULT 0,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO catalog.storefront_settings(id) VALUES(1);
CREATE TABLE catalog.storefront_changes (
  id bigserial PRIMARY KEY,
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK(action IN ('draft_saved','published','category_created')),
  version bigint NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX storefront_changes_time ON catalog.storefront_changes(created_at DESC,id DESC);
