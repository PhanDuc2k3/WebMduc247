ALTER TABLE order_service.admin_return_actions ADD COLUMN read_version integer;
ALTER TABLE order_service.admin_return_actions ADD COLUMN result_version integer;
CREATE TABLE order_service.return_exception_actions (
  id bigserial PRIMARY KEY,
  exception_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK(action IN ('requested','approved','rejected')),
  reason text NOT NULL,
  read_version integer NOT NULL,
  result_version integer NOT NULL,
  next_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX return_exception_actions_target ON order_service.return_exception_actions(exception_id,id);
