-- A case-originated transition already increments its version. Only a direct queue
-- change needs another increment; keep UPDATE ... RETURNING version valid for callers.
CREATE OR REPLACE FUNCTION order_service.sync_queue_case_deadline() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.kind IN ('RETURN','TICKET','DISPUTE') AND NEW.resolution_due_at IS DISTINCT FROM OLD.resolution_due_at THEN
    UPDATE order_service.admin_cases SET due_at=NEW.resolution_due_at,
      version=version+CASE WHEN pg_trigger_depth()=1 THEN 1 ELSE 0 END,updated_at=now()
      WHERE id=NEW.source_id::uuid AND due_at IS DISTINCT FROM NEW.resolution_due_at;
  END IF;
  RETURN NEW;
END $$;
