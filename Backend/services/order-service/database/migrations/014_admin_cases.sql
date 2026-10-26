CREATE TABLE order_service.return_policies (
  id text PRIMARY KEY,
  window_days integer NOT NULL CHECK (window_days BETWEEN 1 AND 365),
  effective_at timestamptz NOT NULL UNIQUE,
  description text NOT NULL
);
INSERT INTO order_service.return_policies VALUES
  ('RETURN_7D_V1',7,'1970-01-01T00:00:00Z','Trả hàng trong 7 ngày từ lần giao thành công đầu tiên.');
ALTER TABLE order_service.return_requests
  ADD COLUMN policy_version text NOT NULL DEFAULT 'RETURN_7D_V1' REFERENCES order_service.return_policies(id),
  ADD COLUMN window_days integer NOT NULL DEFAULT 7,
  ADD COLUMN delivered_at_snapshot timestamptz,
  ADD COLUMN reservation_released_at timestamptz,
  ADD COLUMN refund_confirmed_at timestamptz;
UPDATE order_service.return_requests r SET delivered_at_snapshot=(
  SELECT min(h.occurred_at) FROM order_service.order_status_history h
  WHERE h.shop_order_id=r.shop_order_id AND h.to_status='DELIVERED');
UPDATE order_service.return_requests r SET reservation_released_at=r.updated_at
  WHERE r.status='REJECTED' OR (r.status='CLOSED' AND EXISTS(
    SELECT 1 FROM order_service.return_history h WHERE h.request_id=r.id AND h.to_status='REJECTED'));
UPDATE order_service.return_requests r SET refund_confirmed_at=r.updated_at
  WHERE r.status='REFUNDED' OR EXISTS(
    SELECT 1 FROM order_service.return_history h WHERE h.request_id=r.id AND h.to_status='REFUNDED');

CREATE TABLE order_service.admin_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('RETURN','TICKET','DISPUTE')),
  return_request_id uuid UNIQUE REFERENCES order_service.return_requests(id) ON DELETE CASCADE,
  shop_order_id uuid NOT NULL REFERENCES order_service.orders(id),
  assignee_id uuid,
  due_at timestamptz NOT NULL DEFAULT now()+interval '48 hours',
  version integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  creation_key uuid,
  creation_hash text,
  UNIQUE(created_by,creation_key),
  CHECK ((kind='RETURN')=(return_request_id IS NOT NULL))
);
CREATE TABLE order_service.support_tickets (
  id uuid PRIMARY KEY REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED'))
);
CREATE TABLE order_service.disputes (
  id uuid PRIMARY KEY REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  reason_code text NOT NULL DEFAULT 'OTHER',
  status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','INVESTIGATING','AWAITING_DECISION','DECIDED','CLOSED'))
);
CREATE TABLE order_service.case_links (
  source_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(source_id,target_id),CHECK(source_id<>target_id)
);
CREATE TABLE order_service.case_events (
  id bigserial PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO order_service.admin_cases(id,kind,return_request_id,shop_order_id,due_at,created_at)
  SELECT id,'RETURN',id,shop_order_id,requested_at+interval '48 hours',requested_at FROM order_service.return_requests;
CREATE FUNCTION order_service.create_return_case() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO order_service.admin_cases(id,kind,return_request_id,shop_order_id,created_by,due_at)
    VALUES(NEW.id,'RETURN',NEW.id,NEW.shop_order_id,NEW.buyer_id,now()+interval '48 hours');
  RETURN NEW;
END $$;
CREATE TRIGGER create_return_case AFTER INSERT ON order_service.return_requests
  FOR EACH ROW EXECUTE FUNCTION order_service.create_return_case();
CREATE INDEX admin_cases_queue ON order_service.admin_cases(kind,assignee_id,due_at,id);
CREATE INDEX admin_cases_order ON order_service.admin_cases(shop_order_id);
CREATE INDEX case_events_case ON order_service.case_events(case_id,id DESC);

CREATE TABLE order_service.case_permissions (
  user_id uuid NOT NULL,
  permission text NOT NULL CHECK(permission IN ('exception.request','exception.approve','evidence.supervise')),
  granted_by text NOT NULL,
  reason text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  PRIMARY KEY(user_id,permission)
);
CREATE TABLE order_service.case_permission_history (
  id bigserial PRIMARY KEY,user_id uuid NOT NULL,permission text NOT NULL,
  action text NOT NULL CHECK(action IN ('grant','revoke')),actor text NOT NULL,reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE order_service.return_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_order_id uuid NOT NULL REFERENCES order_service.orders(id),
  buyer_id uuid NOT NULL,
  request_payload jsonb NOT NULL,
  client_request_id uuid NOT NULL UNIQUE,
  policy_version text NOT NULL REFERENCES order_service.return_policies(id),
  delivered_at_snapshot timestamptz NOT NULL,
  requested_by uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','REJECTED','CONSUMED')),
  version integer NOT NULL DEFAULT 1,
  approved_by uuid,
  decision_reason text,
  result_return_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CHECK(approved_by IS NULL OR approved_by<>requested_by)
);
ALTER TABLE order_service.return_requests ADD COLUMN exception_id uuid UNIQUE REFERENCES order_service.return_exceptions(id);

CREATE TABLE order_service.case_information_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  recipient_kind text NOT NULL CHECK(recipient_kind IN ('BUYER','SELLER')),
  prompt text NOT NULL CHECK(char_length(prompt) BETWEEN 10 AND 2000),
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RESPONDED','CANCELLED')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);
CREATE TABLE order_service.case_information_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES order_service.case_information_requests(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,actor_type text NOT NULL CHECK(actor_type IN ('BUYER','SELLER')),
  message text NOT NULL CHECK(char_length(message) BETWEEN 10 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE order_service.case_evidence_grants (
  token_hash text PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES order_service.admin_cases(id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES order_service.return_evidence(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,reason text NOT NULL,
  expires_at timestamptz NOT NULL,used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
