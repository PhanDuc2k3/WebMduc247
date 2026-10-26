ALTER TABLE catalog.stores ADD COLUMN platform_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE catalog.stores ADD COLUMN platform_suspension_reason text;
ALTER TABLE catalog.stores ADD COLUMN admin_version bigint NOT NULL DEFAULT 0;
ALTER TABLE catalog.products ADD COLUMN platform_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE catalog.products ADD COLUMN platform_suspension_reason text;
ALTER TABLE catalog.products ADD COLUMN platform_previous_status text;
ALTER TABLE catalog.products ADD COLUMN admin_version bigint NOT NULL DEFAULT 0;
CREATE TABLE catalog.platform_admin_actions (
  id bigserial PRIMARY KEY,
  actor_id uuid NOT NULL,
  target_id uuid NOT NULL,
  target_type text NOT NULL CHECK(target_type IN ('store','product')),
  action text NOT NULL CHECK(action IN ('suspend','restore')),
  previous_status text NOT NULL,
  next_status text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catalog_admin_actions_time ON catalog.platform_admin_actions(created_at DESC,id DESC);
CREATE INDEX catalog_admin_actions_target ON catalog.platform_admin_actions(target_id,created_at DESC);
