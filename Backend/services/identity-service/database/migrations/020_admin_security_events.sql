CREATE FUNCTION account_security_status_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status='suspended' THEN
    NEW.security_version=OLD.security_version+1;
    UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=OLD.id AND revoked_at IS NULL;
    UPDATE admin_auth_challenges SET consumed_at=now() WHERE user_id=OLD.id AND consumed_at IS NULL;
    INSERT INTO security_events(user_id,action,metadata) VALUES(OLD.id,'account_suspended','{"source":"account_status"}');
  ELSIF OLD.status='suspended' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO security_events(user_id,action,metadata) VALUES(OLD.id,'account_restored','{"source":"account_status"}');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER account_security_status_change BEFORE UPDATE OF status ON users
  FOR EACH ROW EXECUTE FUNCTION account_security_status_change();
