CREATE TABLE order_service.admin_approval_policies (
  operation text PRIMARY KEY CHECK(operation IN ('return_approve','cancel_paid_order')),
  threshold_minor bigint NOT NULL CHECK(threshold_minor>=0 AND threshold_minor<=9007199254740991),
  version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
-- Conservative initial policy: every positive amount needs independent approval.
INSERT INTO order_service.admin_approval_policies(operation,threshold_minor) VALUES('return_approve',0),('cancel_paid_order',0);
CREATE TABLE order_service.admin_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation text NOT NULL REFERENCES order_service.admin_approval_policies(operation),
  target_id uuid NOT NULL, snapshot jsonb NOT NULL, fingerprint text NOT NULL, policy_version integer NOT NULL,
  created_by uuid NOT NULL, reviewed_by uuid, executed_by uuid,
  status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','APPROVED','REJECTED','EXECUTED')),
  version integer NOT NULL DEFAULT 1, request_id uuid NOT NULL, reason text NOT NULL, review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, executed_at timestamptz,
  UNIQUE(created_by,request_id), CHECK(reviewed_by IS NULL OR reviewed_by<>created_by)
);
CREATE INDEX admin_approvals_queue ON order_service.admin_approvals(status,created_at);
CREATE TABLE order_service.admin_approval_events (
  id bigserial PRIMARY KEY, approval_id uuid REFERENCES order_service.admin_approvals(id),
  actor_id uuid NOT NULL, action text NOT NULL, reason text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
