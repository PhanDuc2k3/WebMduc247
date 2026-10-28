ALTER TABLE catalog.stores ADD COLUMN registration_status text NOT NULL DEFAULT 'NOT_REQUIRED'
  CHECK(registration_status IN ('NOT_REQUIRED','PENDING','NEEDS_INFORMATION','APPROVED','REJECTED'));

CREATE TABLE catalog.store_profile_versions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,store_id uuid NOT NULL REFERENCES catalog.stores(id),
  submitted_by uuid NOT NULL,profile jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE catalog.store_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),store_id uuid NOT NULL REFERENCES catalog.stores(id),
  recipient_id uuid NOT NULL,actor_id uuid NOT NULL,action text NOT NULL,
  reason text NOT NULL CHECK(length(reason) BETWEEN 8 AND 500),
  scope text NOT NULL,appeal_path text NOT NULL DEFAULT '/mystore',
  profile_version_id bigint REFERENCES catalog.store_profile_versions(id),
  impact jsonb,created_at timestamptz NOT NULL DEFAULT now(),read_at timestamptz
);
CREATE INDEX store_decisions_inbox ON catalog.store_decisions(store_id,created_at DESC);
CREATE TABLE catalog.store_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),store_id uuid NOT NULL REFERENCES catalog.stores(id),
  incident_key text NOT NULL CHECK(length(incident_key) BETWEEN 8 AND 160),
  reason text NOT NULL,remedy_by timestamptz NOT NULL,actor_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'WARNING' CHECK(status IN ('WARNING','REMEDIED','OVERTURNED')),
  created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(store_id,incident_key)
);
ALTER TABLE catalog.store_decisions ADD COLUMN violation_id uuid REFERENCES catalog.store_violations(id);
CREATE TABLE catalog.store_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),store_id uuid NOT NULL REFERENCES catalog.stores(id),
  decision_id uuid NOT NULL REFERENCES catalog.store_decisions(id),submitted_by uuid NOT NULL,
  reason text NOT NULL CHECK(length(reason) BETWEEN 8 AND 2000),
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','UPHELD','OVERTURNED')),
  reviewer_id uuid,review_reason text,created_at timestamptz NOT NULL DEFAULT now(),reviewed_at timestamptz,
  UNIQUE(decision_id)
);
CREATE TABLE catalog.store_governance_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,store_id uuid NOT NULL REFERENCES catalog.stores(id),
  actor_id uuid NOT NULL,action text NOT NULL,reason text NOT NULL,metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Keep the effective state derived even when another writer updates a store.
CREATE FUNCTION catalog.enforce_store_effective_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.status=CASE WHEN NEW.platform_suspended OR NEW.registration_status NOT IN ('NOT_REQUIRED','APPROVED')
    OR EXISTS(SELECT 1 FROM catalog.store_settings WHERE store_id=NEW.id AND NOT accepting_orders)
    THEN 'paused' ELSE 'active' END;
  RETURN NEW;
END $$;
CREATE TRIGGER store_effective_state BEFORE INSERT OR UPDATE ON catalog.stores
  FOR EACH ROW EXECUTE FUNCTION catalog.enforce_store_effective_state();
UPDATE catalog.stores SET status=status;
