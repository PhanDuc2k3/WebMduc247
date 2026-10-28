CREATE TABLE user_admin_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_reference uuid,action text NOT NULL CHECK(action IN ('suspend','restore','expire','appeal_restore')),
  reason_code text NOT NULL,reason text NOT NULL,restriction_scope text NOT NULL DEFAULT 'ACCOUNT' CHECK(restriction_scope='ACCOUNT'),
  expires_at timestamptz,counts_violation boolean NOT NULL DEFAULT false,
  outcome text NOT NULL DEFAULT 'UPHELD' CHECK(outcome IN ('UPHELD','OVERTURNED')),
  original_decision_id uuid REFERENCES user_admin_decisions(id),read_version bigint,result_version bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN current_suspension_id uuid REFERENCES user_admin_decisions(id),ADD COLUMN anonymized_at timestamptz;
INSERT INTO user_admin_decisions(user_id,actor_reference,action,reason_code,reason,read_version,result_version,created_at)
  SELECT a.target_id,coalesce(a.actor_reference,a.actor_id),a.action,'LEGACY',a.reason,a.read_version,a.result_version,a.created_at
  FROM platform_admin_actions a JOIN users u ON u.id=a.target_id;
UPDATE users u SET current_suspension_id=(SELECT id FROM user_admin_decisions d WHERE d.user_id=u.id AND d.action='suspend' ORDER BY created_at DESC,id DESC LIMIT 1)
  WHERE u.status='suspended';
CREATE TABLE user_admin_events (
  id bigserial PRIMARY KEY,user_reference uuid,actor_reference uuid,action text NOT NULL,reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',request_id uuid,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_admin_events_target ON user_admin_events(user_reference,id DESC);
CREATE UNIQUE INDEX user_admin_event_request ON user_admin_events(actor_reference,request_id,action) WHERE request_id IS NOT NULL;
CREATE TABLE user_admin_teams(id text PRIMARY KEY,name text NOT NULL,version integer NOT NULL DEFAULT 1);
INSERT INTO user_admin_teams VALUES('support','Chăm sóc khách hàng',1),('trust','An toàn tài khoản',1),('privacy','Xử lý dữ liệu cá nhân',1);
CREATE TABLE user_admin_team_members(team_id text NOT NULL REFERENCES user_admin_teams(id),staff_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,PRIMARY KEY(team_id,staff_id));
CREATE TABLE user_admin_assignments(user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,team_id text NOT NULL REFERENCES user_admin_teams(id),version integer NOT NULL DEFAULT 1);
CREATE TABLE user_internal_notes(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id text NOT NULL REFERENCES user_admin_teams(id),author_reference uuid NOT NULL,body text NOT NULL CHECK(char_length(body) BETWEEN 10 AND 2000),
  request_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(author_reference,request_id)
);
CREATE TABLE user_support_challenges(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,attempts integer NOT NULL DEFAULT 0,expires_at timestamptz NOT NULL,
  consumed_at timestamptz,security_version bigint NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_support_grants(
  token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,security_version bigint NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL
);
CREATE TABLE user_workflow_cases(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK(kind IN ('APPEAL','ACCESS','RECTIFY','ANONYMIZE')),
  original_decision_id uuid REFERENCES user_admin_decisions(id) ON DELETE SET NULL,
  legacy_privacy_request_id uuid UNIQUE REFERENCES privacy_requests(id) ON DELETE SET NULL,
  summary text NOT NULL,payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','IN_REVIEW','WAITING_RETENTION','WAITING_CLEANUP','COMPLETED','REJECTED','CANCELLED')),
  assignee_id uuid,identity_verified_at timestamptz,proof_method text NOT NULL,
  reviewed_by uuid,review_reason text,request_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz,
  UNIQUE(user_id,request_id),CHECK((kind='APPEAL')=(original_decision_id IS NOT NULL))
);
CREATE UNIQUE INDEX user_one_open_appeal ON user_workflow_cases(original_decision_id) WHERE kind='APPEAL' AND status IN ('NEW','IN_REVIEW');
CREATE TABLE user_retention_reviews(
  case_id uuid NOT NULL REFERENCES user_workflow_cases(id) ON DELETE CASCADE,module text NOT NULL CHECK(module IN ('identity','catalog','order','payment','engagement','chat')),
  disposition text NOT NULL CHECK(disposition IN ('CLEAR','RETAIN')),
  basis_reference text NOT NULL,reason text NOT NULL,retain_until timestamptz,reviewed_by uuid NOT NULL,reviewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(case_id,module),CHECK(disposition<>'RETAIN' OR retain_until IS NOT NULL)
);
CREATE TABLE user_privacy_artifacts(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL UNIQUE REFERENCES user_workflow_cases(id) ON DELETE CASCADE,
  encrypted_payload jsonb NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_asset_cleanup(
  case_id uuid PRIMARY KEY REFERENCES user_workflow_cases(id) ON DELETE CASCADE,avatar_key text NOT NULL,attempts integer NOT NULL DEFAULT 0,
  last_error text,completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE identity_email_outbox DROP CONSTRAINT identity_email_outbox_purpose_check;
ALTER TABLE identity_email_outbox ADD CONSTRAINT identity_email_outbox_purpose_check CHECK(purpose IN ('verify_email','reset_password','security_notice','account_support'));
CREATE INDEX user_workflow_queue ON user_workflow_cases(kind,status,created_at,id);
CREATE INDEX user_decisions_user ON user_admin_decisions(user_id,created_at DESC);
CREATE INDEX user_support_challenges_user ON user_support_challenges(user_id,created_at DESC);
CREATE INDEX user_investigation_ip_time ON security_events(ip,occurred_at,user_id) WHERE ip IS NOT NULL;
