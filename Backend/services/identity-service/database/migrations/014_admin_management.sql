ALTER TABLE users ADD COLUMN admin_version bigint NOT NULL DEFAULT 0;
CREATE TABLE platform_admin_actions (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('suspend','restore')),
  previous_status text NOT NULL,
  next_status text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX platform_admin_actions_time ON platform_admin_actions(created_at DESC,id DESC);
CREATE INDEX platform_admin_actions_target ON platform_admin_actions(target_id,created_at DESC);
