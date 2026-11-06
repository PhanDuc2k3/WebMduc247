-- Queue owns the elapsed pause time; keep the case deadline used by all readers in sync.
CREATE FUNCTION order_service.sync_queue_case_deadline() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.kind IN ('RETURN','TICKET','DISPUTE') AND NEW.resolution_due_at IS DISTINCT FROM OLD.resolution_due_at THEN
    UPDATE order_service.admin_cases SET due_at=NEW.resolution_due_at,version=version+1,updated_at=now()
      WHERE id=NEW.source_id::uuid AND due_at IS DISTINCT FROM NEW.resolution_due_at;
  END IF;
  RETURN NEW;
END $$;
-- A deadline-only echo must not update the queue again or increment its version twice.
CREATE OR REPLACE FUNCTION order_service.sync_case_work_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE next_state text; active boolean;
BEGIN
  IF TG_OP='UPDATE' AND pg_trigger_depth()>1 AND NEW.due_at IS DISTINCT FROM OLD.due_at
    AND NEW.workflow_status IS NOT DISTINCT FROM OLD.workflow_status
    AND NEW.assignee_id IS NOT DISTINCT FROM OLD.assignee_id
    AND EXISTS(SELECT 1 FROM order_service.work_items WHERE kind=NEW.kind AND source_id=NEW.id::text AND resolution_due_at=NEW.due_at) THEN
    RETURN NEW;
  END IF;
  active=NEW.workflow_status NOT IN ('CLOSED','RESOLVED','DECIDED');
  next_state=CASE WHEN NOT active THEN 'RESOLVED' WHEN NEW.workflow_status='WAITING_INFORMATION' THEN 'WAITING_RESPONSE'
    WHEN NEW.workflow_status='AWAITING_APPROVAL' THEN 'AWAITING_APPROVAL' WHEN NEW.workflow_status='NEW' THEN 'OPEN' ELSE 'IN_PROGRESS' END;
  INSERT INTO order_service.work_items(kind,source_id,shop_order_id,store_id,case_kind,title,source_status,source_active,assignee_id,state,resolution_due_at,created_at)
    SELECT NEW.kind,NEW.id::text,NEW.shop_order_id,o.store_id,NEW.kind,'Hồ sơ '||NEW.kind||' #'||left(NEW.id::text,8),
      NEW.workflow_status,active,NEW.assignee_id,next_state,NEW.due_at,NEW.created_at FROM order_service.orders o WHERE o.id=NEW.shop_order_id
    ON CONFLICT(kind,source_id) DO UPDATE SET source_status=EXCLUDED.source_status,source_active=EXCLUDED.source_active,
      assignee_id=EXCLUDED.assignee_id,resolution_due_at=CASE WHEN NEW.due_at IS DISTINCT FROM OLD.due_at THEN EXCLUDED.resolution_due_at ELSE work_items.resolution_due_at END,
      state=CASE WHEN NEW.workflow_status IS DISTINCT FROM OLD.workflow_status THEN EXCLUDED.state ELSE work_items.state END;
  RETURN NEW;
END $$;
CREATE TRIGGER sync_queue_case_deadline AFTER UPDATE ON order_service.work_items
  FOR EACH ROW EXECUTE FUNCTION order_service.sync_queue_case_deadline();
UPDATE order_service.admin_cases c SET due_at=w.resolution_due_at,version=c.version+1,updated_at=now()
  FROM order_service.work_items w WHERE w.kind IN ('RETURN','TICKET','DISPUTE') AND w.source_id=c.id::text
  AND c.due_at IS DISTINCT FROM w.resolution_due_at;
