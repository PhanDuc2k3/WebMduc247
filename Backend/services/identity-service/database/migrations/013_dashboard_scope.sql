-- The initial local draft included moderation. Keep the delivered scope to login/dashboard.
-- This draft-only table must be empty; never discard an existing audit trail.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM platform_admin_audit_log LIMIT 1) THEN
    RAISE EXCEPTION 'Refusing to remove a nonempty admin audit log';
  END IF;
END $$;
DROP TABLE platform_admin_audit_log;
