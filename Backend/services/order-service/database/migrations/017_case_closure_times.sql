CREATE OR REPLACE FUNCTION order_service.sync_case_workflow() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE order_service.admin_cases SET workflow_status=order_service.case_workflow_state(NEW.status),
    resolved_at=CASE WHEN NEW.status IN ('REFUNDED','RESOLVED','CLOSED') THEN coalesce(resolved_at,now()) ELSE resolved_at END,
    closed_at=CASE WHEN NEW.status='CLOSED' THEN now() ELSE closed_at END,updated_at=now() WHERE id=NEW.id;
  IF TG_TABLE_NAME='return_requests' AND NEW.status='REFUNDED' THEN
    UPDATE order_service.case_obligations SET status='FULFILLED',completed_at=now(),completion_note='Payment xác nhận hoàn tiền.'
      WHERE return_id=NEW.id AND status='PENDING';
    UPDATE order_service.admin_cases c SET workflow_status='RESOLVED',resolved_at=coalesce(c.resolved_at,now()),version=version+1
      WHERE c.workflow_status='WAITING_FULFILLMENT' AND EXISTS(SELECT 1 FROM order_service.case_obligations o WHERE o.case_id=c.id AND o.return_id=NEW.id)
        AND NOT EXISTS(SELECT 1 FROM order_service.case_obligations o WHERE o.case_id=c.id AND o.status='PENDING');
  END IF;
  RETURN NEW;
END $$;
UPDATE order_service.admin_cases SET resolved_at=coalesce(closed_at,updated_at) WHERE workflow_status='CLOSED' AND resolved_at IS NULL;
