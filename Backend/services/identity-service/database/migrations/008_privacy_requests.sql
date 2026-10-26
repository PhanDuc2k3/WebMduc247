CREATE TABLE privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  request_type text NOT NULL DEFAULT 'DELETE_ACCOUNT' CHECK (request_type = 'DELETE_ACCOUNT'),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CANCELLED', 'COMPLETED', 'REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_note text
);
CREATE UNIQUE INDEX privacy_requests_one_pending_per_user ON privacy_requests(user_id) WHERE status='PENDING';
CREATE INDEX privacy_requests_pending_idx ON privacy_requests(created_at) WHERE status='PENDING';
