ALTER TABLE catalog.stores ADD COLUMN reputation_badge_until timestamptz;
ALTER TABLE catalog.stores ADD COLUMN reputation_badge_evidence jsonb;
CREATE TABLE catalog.store_ownership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),store_id uuid NOT NULL REFERENCES catalog.stores(id),
  kind text NOT NULL CHECK(kind IN ('TRANSFER','RECOVERY')),previous_owner_id uuid NOT NULL,target_user_id uuid NOT NULL,
  proposed_by uuid NOT NULL,verification_ref text NOT NULL,reason text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
  reviewer_id uuid,review_verification_ref text,review_reason text,read_version bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),reviewed_at timestamptz
);
CREATE UNIQUE INDEX one_pending_ownership_request ON catalog.store_ownership_requests(store_id) WHERE status='PENDING';
