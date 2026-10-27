ALTER TABLE users ADD COLUMN admin_access_version bigint NOT NULL DEFAULT 0;
CREATE TABLE admin_role_assignments (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('system_admin','operations','customer_support','moderator','finance','marketing','content_editor','auditor','legacy_admin')),
  scope jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(scope)='object'),
  PRIMARY KEY(user_id,role)
);
CREATE TABLE admin_access_events (
  id bigserial PRIMARY KEY, actor_reference text NOT NULL, target_reference uuid NOT NULL,
  reason text NOT NULL, before_roles jsonb NOT NULL, after_roles jsonb NOT NULL,
  read_version bigint NOT NULL, result_version bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
-- Snapshot only accounts present at migration time. Future platform_admin roles grant nothing.
INSERT INTO admin_role_assignments(user_id,role)
  SELECT user_id,'legacy_admin' FROM user_roles WHERE role='platform_admin';
INSERT INTO admin_access_events(actor_reference,target_reference,reason,before_roles,after_roles,read_version,result_version)
  SELECT 'migration:017',user_id,'Explicit migration of existing platform_admin; financial permissions require separate assignment.',
    '[]','[{"role":"legacy_admin","scope":{}}]',0,1 FROM admin_role_assignments;
UPDATE users SET admin_access_version=1 WHERE id IN (SELECT user_id FROM admin_role_assignments);
