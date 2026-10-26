CREATE TABLE catalog.admin_commands (
  actor_id uuid NOT NULL,
  request_id uuid NOT NULL,
  scope text NOT NULL,
  fingerprint text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(actor_id,request_id)
);
ALTER TABLE catalog.platform_admin_actions ADD COLUMN read_version bigint;
ALTER TABLE catalog.platform_admin_actions ADD COLUMN result_version bigint;
ALTER TABLE catalog.platform_admin_actions ADD COLUMN correlation_id uuid;
ALTER TABLE catalog.storefront_changes ADD COLUMN reason text;
ALTER TABLE catalog.storefront_changes ADD COLUMN read_version bigint;
ALTER TABLE catalog.storefront_changes ADD COLUMN correlation_id uuid;
