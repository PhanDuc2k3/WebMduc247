ALTER TABLE order_service.return_requests ADD COLUMN IF NOT EXISTS admin_response text;

CREATE TABLE IF NOT EXISTS order_service.admin_return_actions (
  id bigserial PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES order_service.return_requests(id),
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('review','approve','reject','view_evidence')),
  previous_status text NOT NULL,
  next_status text NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 500),
  evidence_id uuid REFERENCES order_service.return_evidence(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_return_actions_request
  ON order_service.admin_return_actions(request_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS returns_admin_status_requested
  ON order_service.return_requests(status,requested_at DESC,id DESC);
