-- Additive role expansion: existing buyers/sellers keep all permissions and sessions.
ALTER TABLE user_roles DROP CONSTRAINT user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('buyer', 'seller', 'platform_admin'));

CREATE TABLE platform_admin_audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES users(id),
  target_user_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL CHECK (action IN ('suspend', 'restore')),
  previous_status text NOT NULL,
  next_status text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX platform_admin_audit_created ON platform_admin_audit_log(created_at DESC,id DESC);
