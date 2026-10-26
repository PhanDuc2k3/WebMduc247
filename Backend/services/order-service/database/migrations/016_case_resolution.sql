ALTER TABLE order_service.admin_cases
  ADD COLUMN workflow_status text NOT NULL DEFAULT 'NEW' CHECK(workflow_status IN
    ('NEW','IN_REVIEW','WAITING_INFORMATION','AWAITING_APPROVAL','DECIDED','WAITING_FULFILLMENT','RESOLVED','CLOSED')),
  ADD COLUMN escalation_level integer NOT NULL DEFAULT 0,
  ADD COLUMN resolved_at timestamptz,
  ADD COLUMN closed_at timestamptz;
CREATE FUNCTION order_service.case_workflow_state(state text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN state IN ('REQUESTED','NEW','OPEN') THEN 'NEW'
    WHEN state IN ('UNDER_REVIEW','IN_PROGRESS','INVESTIGATING') THEN 'IN_REVIEW'
    WHEN state='WAITING_CUSTOMER' THEN 'WAITING_INFORMATION'
    WHEN state='AWAITING_DECISION' THEN 'AWAITING_APPROVAL'
    WHEN state IN ('APPROVED','RETURNING','RECEIVED','REFUND_PENDING') THEN 'WAITING_FULFILLMENT'
    WHEN state IN ('REJECTED','DECIDED') THEN 'DECIDED'
    WHEN state IN ('REFUNDED','RESOLVED') THEN 'RESOLVED' WHEN state='CLOSED' THEN 'CLOSED' ELSE 'IN_REVIEW' END
$$;
UPDATE order_service.admin_cases c SET workflow_status=order_service.case_workflow_state(
  coalesce((SELECT status FROM order_service.return_requests WHERE id=c.return_request_id),
    (SELECT status FROM order_service.support_tickets WHERE id=c.id),(SELECT status FROM order_service.disputes WHERE id=c.id)));
UPDATE order_service.admin_cases SET resolved_at=updated_at WHERE workflow_status='RESOLVED';
UPDATE order_service.admin_cases SET closed_at=updated_at WHERE workflow_status='CLOSED';
CREATE FUNCTION order_service.sync_case_workflow() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE order_service.admin_cases SET workflow_status=order_service.case_workflow_state(NEW.status),
    resolved_at=CASE WHEN NEW.status IN ('REFUNDED','RESOLVED') THEN coalesce(resolved_at,now()) ELSE resolved_at END,
    closed_at=CASE WHEN NEW.status='CLOSED' THEN now() ELSE closed_at END,updated_at=now()
    WHERE id=NEW.id;
  RETURN NEW;
END $$;
CREATE TRIGGER sync_return_workflow AFTER UPDATE OF status ON order_service.return_requests
  FOR EACH ROW WHEN(OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION order_service.sync_case_workflow();
CREATE TRIGGER sync_ticket_workflow AFTER UPDATE OF status ON order_service.support_tickets
  FOR EACH ROW WHEN(OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION order_service.sync_case_workflow();
CREATE TRIGGER sync_dispute_workflow AFTER UPDATE OF status ON order_service.disputes
  FOR EACH ROW WHEN(OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION order_service.sync_case_workflow();

CREATE TABLE order_service.case_resolution_policies (
  id text PRIMARY KEY,description text NOT NULL,appeal_days integer NOT NULL CHECK(appeal_days BETWEEN 1 AND 90),
  seller_response_hours integer NOT NULL,seller_receive_hours integer NOT NULL,buyer_ship_days integer NOT NULL
);
INSERT INTO order_service.case_resolution_policies VALUES('CASE_RESOLUTION_V1',
  'Xử lý theo chứng cứ, bảo toàn snapshot/tiền, tách quyết định và thực hiện nghĩa vụ; người xét kháng nghị độc lập.',7,48,72,7);
ALTER TABLE order_service.return_requests
  ADD COLUMN ship_by timestamptz,
  ADD COLUMN seller_receive_by timestamptz;
UPDATE order_service.return_requests SET ship_by=updated_at+interval '7 days' WHERE status='APPROVED';
UPDATE order_service.return_requests SET seller_receive_by=updated_at+interval '72 hours' WHERE status='RETURNING';
ALTER TABLE order_service.case_permissions DROP CONSTRAINT case_permissions_permission_check;
ALTER TABLE order_service.case_permissions ADD CONSTRAINT case_permissions_permission_check CHECK(permission IN
  ('exception.request','exception.approve','evidence.supervise','case.decision.approve','case.appeal.review','aftersales.intervene'));

CREATE TABLE order_service.case_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,visibility text NOT NULL CHECK(visibility IN ('INTERNAL','PUBLIC')),
  recipient_kind text CHECK(recipient_kind IN ('BUYER','SELLER','BOTH')),body text NOT NULL,
  client_request_id uuid NOT NULL,request_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_id,client_request_id),CHECK((visibility='PUBLIC')=(recipient_kind IS NOT NULL))
);
CREATE TABLE order_service.case_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,from_assignee uuid,to_assignee uuid NOT NULL,level integer NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE order_service.case_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,party text NOT NULL CHECK(party IN ('BUYER','SELLER')),requested_resolution text NOT NULL,
  content text NOT NULL,client_request_id uuid NOT NULL,request_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(actor_id,client_request_id)
);
CREATE TABLE order_service.case_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,party text NOT NULL CHECK(party IN ('BUYER','SELLER')),mime_type text NOT NULL,
  data bytea NOT NULL,content_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE order_service.case_resolution_grants (
  token_hash text PRIMARY KEY,case_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES order_service.case_evidence(id) ON DELETE CASCADE,actor_id uuid NOT NULL,
  reason text NOT NULL,expires_at timestamptz NOT NULL,used_at timestamptz
);
CREATE TABLE order_service.case_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('RETURN_APPROVE','RETURN_REJECT','DISPUTE_RESOLUTION')),
  status text NOT NULL CHECK(status IN ('PROPOSED','PUBLISHED','REJECTED','WITHDRAWN')),
  proposed_by uuid NOT NULL,reviewed_by uuid,policy_version text NOT NULL REFERENCES order_service.case_resolution_policies(id),
  responsible_party text NOT NULL CHECK(responsible_party IN ('BUYER','SELLER','CARRIER','PLATFORM','UNDETERMINED')),
  reason text NOT NULL,basis_summary text NOT NULL,evidence_refs jsonb NOT NULL,
  outcome text NOT NULL CHECK(outcome IN ('RETURN_REQUIRED','REFUND_EXISTING_RETURN','NO_COMPENSATION','OTHER_REMEDY')),
  return_id uuid REFERENCES order_service.return_requests(id),snapshot jsonb NOT NULL,
  expected_case_version integer NOT NULL,expected_return_version integer,review_reason text,
  proposed_at timestamptz NOT NULL DEFAULT now(),published_at timestamptz,reviewed_at timestamptz,appeal_until timestamptz
);
CREATE UNIQUE INDEX one_pending_case_decision ON order_service.case_decisions(case_id) WHERE status='PROPOSED';
CREATE INDEX case_decisions_history ON order_service.case_decisions(case_id,proposed_at DESC);
CREATE TABLE order_service.case_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  decision_id uuid NOT NULL UNIQUE REFERENCES order_service.case_decisions(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('RETURN','REFUND','OTHER')),return_id uuid REFERENCES order_service.return_requests(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','FULFILLED','CANCELLED')),completion_note text,completed_at timestamptz
);
CREATE TABLE order_service.return_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),request_id uuid NOT NULL REFERENCES order_service.return_requests(id) ON DELETE CASCADE,
  actor_id uuid,actor_type text NOT NULL CHECK(actor_type IN ('SELLER','ADMIN','SYSTEM')),
  condition text NOT NULL CHECK(condition IN ('ACCEPTED','ISSUE_FOUND')),note text NOT NULL,basis_refs jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE order_service.case_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  decision_id uuid NOT NULL REFERENCES order_service.case_decisions(id) ON DELETE CASCADE,actor_id uuid NOT NULL,
  party text NOT NULL CHECK(party IN ('BUYER','SELLER')),reason text NOT NULL,
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','UNDER_REVIEW','UPHELD','OVERTURNED')),
  reviewer_id uuid,result_reason text,result_basis jsonb,version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),decided_at timestamptz
);
CREATE UNIQUE INDEX one_appeal_per_party ON order_service.case_appeals(decision_id,party);
CREATE TABLE order_service.case_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,action text NOT NULL,reason text NOT NULL,basis_refs jsonb NOT NULL,
  seller_blocked boolean NOT NULL,previous_status text NOT NULL,next_status text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO order_service.return_inspections(request_id,actor_id,actor_type,condition,note)
  SELECT r.id,NULL,'SYSTEM','ACCEPTED','Chuyển đổi dữ liệu: lịch sử cũ xác nhận đã nhận hàng theo luồng trước đây.'
  FROM order_service.return_requests r WHERE EXISTS(SELECT 1 FROM order_service.return_history h WHERE h.request_id=r.id AND h.to_status='RECEIVED');
INSERT INTO order_service.case_decisions(case_id,kind,status,proposed_by,reviewed_by,policy_version,responsible_party,
  reason,basis_summary,evidence_refs,outcome,return_id,snapshot,expected_case_version,expected_return_version,published_at,reviewed_at,appeal_until,proposed_at)
  SELECT a.request_id,CASE WHEN a.action='approve' THEN 'RETURN_APPROVE' ELSE 'RETURN_REJECT' END,'PUBLISHED',a.actor_id,a.actor_id,
    'CASE_RESOLUTION_V1','UNDETERMINED',a.reason,'Bản ghi trước khi có mẫu quyết định; lý do gốc: '||a.reason,'[]',
    CASE WHEN a.action='approve' THEN 'RETURN_REQUIRED' ELSE 'NO_COMPENSATION' END,a.request_id,
    jsonb_build_object('legacy',true,'amountMinor',r.eligible_refund_minor,'shippingMinor',r.shipping_refund_minor),c.version,r.version,
    a.created_at,a.created_at,a.created_at+interval '7 days',a.created_at
  FROM order_service.admin_return_actions a JOIN order_service.return_requests r ON r.id=a.request_id
  JOIN order_service.admin_cases c ON c.id=r.id WHERE a.action IN ('approve','reject');
INSERT INTO order_service.case_obligations(case_id,decision_id,kind,return_id,status,completed_at)
  SELECT d.case_id,d.id,'RETURN',d.return_id,CASE WHEN r.refund_confirmed_at IS NOT NULL THEN 'FULFILLED' ELSE 'PENDING' END,r.refund_confirmed_at
  FROM order_service.case_decisions d JOIN order_service.return_requests r ON r.id=d.return_id
  WHERE d.kind='RETURN_APPROVE' AND r.status NOT IN ('REJECTED') AND d.id=(
    SELECT id FROM order_service.case_decisions WHERE case_id=d.case_id ORDER BY published_at DESC,id DESC LIMIT 1);
CREATE OR REPLACE FUNCTION order_service.sync_case_workflow() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE order_service.admin_cases SET workflow_status=order_service.case_workflow_state(NEW.status),
    resolved_at=CASE WHEN NEW.status IN ('REFUNDED','RESOLVED') THEN coalesce(resolved_at,now()) ELSE resolved_at END,
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
