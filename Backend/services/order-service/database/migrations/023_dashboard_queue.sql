CREATE TABLE order_service.work_teams (
  id text PRIMARY KEY, name text NOT NULL, leader_id uuid
);
INSERT INTO order_service.work_teams(id,name) VALUES ('operations','Vận hành'),('support','CSKH'),('finance','Tài chính'),('moderation','Kiểm duyệt');
CREATE TABLE order_service.work_sla_policies (
  kind text PRIMARY KEY, response_minutes integer NOT NULL CHECK(response_minutes BETWEEN 1 AND 525600),
  resolution_minutes integer NOT NULL CHECK(resolution_minutes BETWEEN 1 AND 525600),
  reminder_minutes integer NOT NULL CHECK(reminder_minutes BETWEEN 0 AND 10080),
  team_id text NOT NULL REFERENCES order_service.work_teams(id), version integer NOT NULL DEFAULT 1,
  CHECK(resolution_minutes>=response_minutes)
);
INSERT INTO order_service.work_sla_policies(kind,response_minutes,resolution_minutes,reminder_minutes,team_id) VALUES
  ('ORDER',120,1440,60,'operations'),('RETURN',240,2880,60,'support'),('TICKET',120,2880,60,'support'),
  ('DISPUTE',240,4320,120,'support'),('REFUND',120,1440,60,'finance'),('ABUSE_REPORT',120,1440,60,'moderation');
CREATE TABLE order_service.work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind text NOT NULL REFERENCES order_service.work_sla_policies(kind),
  source_id text NOT NULL, shop_order_id uuid REFERENCES order_service.orders(id) ON DELETE CASCADE,store_id uuid,
  case_kind text, title text NOT NULL,source_details jsonb NOT NULL DEFAULT '{}',source_status text NOT NULL,source_active boolean NOT NULL DEFAULT true,
  assignee_id uuid,team_id text NOT NULL REFERENCES order_service.work_teams(id),
  priority text NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('URGENT','HIGH','NORMAL','LOW')),
  state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','IN_PROGRESS','WAITING_RESPONSE','AWAITING_APPROVAL','RESOLVED')),
  response_due_at timestamptz NOT NULL,resolution_due_at timestamptz NOT NULL,first_response_at timestamptz,
  paused_at timestamptz,paused_seconds bigint NOT NULL DEFAULT 0,
  response_minutes integer NOT NULL,resolution_minutes integer NOT NULL,reminder_minutes integer NOT NULL,
  escalation_level integer NOT NULL DEFAULT 0,version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kind,source_id)
);
CREATE TABLE order_service.work_events (
  id bigserial PRIMARY KEY,work_id uuid NOT NULL REFERENCES order_service.work_items(id) ON DELETE CASCADE,
  actor_id uuid,action text NOT NULL,reason text NOT NULL,metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE order_service.work_notifications (
  id bigserial PRIMARY KEY,work_id uuid NOT NULL REFERENCES order_service.work_items(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL,milestone text NOT NULL,due_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),read_at timestamptz,
  UNIQUE(work_id,recipient_id,milestone,due_at)
);
CREATE TABLE order_service.work_source_health (
  source text PRIMARY KEY,updated_at timestamptz,error_code text
);
CREATE TABLE order_service.work_config_events (
  id bigserial PRIMARY KEY,actor_id uuid NOT NULL,kind text NOT NULL,reason text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO order_service.work_source_health(source) VALUES ('orders'),('cases'),('payment'),('chat');
CREATE FUNCTION order_service.work_item_clock() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p order_service.work_sla_policies; elapsed interval;
BEGIN
  IF TG_OP='INSERT' THEN
    SELECT * INTO STRICT p FROM order_service.work_sla_policies WHERE kind=NEW.kind;
    NEW.team_id=coalesce(NEW.team_id,p.team_id);
    NEW.response_minutes=p.response_minutes; NEW.resolution_minutes=p.resolution_minutes; NEW.reminder_minutes=p.reminder_minutes;
    NEW.response_due_at=coalesce(NEW.response_due_at,NEW.created_at+make_interval(mins=>p.response_minutes));
    NEW.resolution_due_at=coalesce(NEW.resolution_due_at,NEW.created_at+make_interval(mins=>p.resolution_minutes));
  ELSE
    NEW.version=OLD.version+1;
    IF OLD.paused_at IS NOT NULL AND (NEW.state<>'WAITING_RESPONSE' OR NOT NEW.source_active) THEN
      elapsed=clock_timestamp()-OLD.paused_at;
      NEW.resolution_due_at=OLD.resolution_due_at+elapsed;
      NEW.paused_seconds=OLD.paused_seconds+extract(epoch FROM elapsed)::bigint; NEW.paused_at=NULL;
    END IF;
  END IF;
  IF NEW.state='WAITING_RESPONSE' AND NEW.source_active AND NEW.paused_at IS NULL THEN NEW.paused_at=clock_timestamp(); END IF;
  NEW.updated_at=now();
  RETURN NEW;
END $$;
CREATE TRIGGER work_item_clock BEFORE INSERT OR UPDATE ON order_service.work_items FOR EACH ROW EXECUTE FUNCTION order_service.work_item_clock();
CREATE FUNCTION order_service.sync_case_work_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE next_state text; active boolean;
BEGIN
  active=NEW.workflow_status NOT IN ('CLOSED','RESOLVED','DECIDED');
  next_state=CASE WHEN NOT active THEN 'RESOLVED' WHEN NEW.workflow_status='WAITING_INFORMATION' THEN 'WAITING_RESPONSE'
    WHEN NEW.workflow_status='AWAITING_APPROVAL' THEN 'AWAITING_APPROVAL' WHEN NEW.workflow_status='NEW' THEN 'OPEN' ELSE 'IN_PROGRESS' END;
  INSERT INTO order_service.work_items(kind,source_id,shop_order_id,store_id,case_kind,title,source_status,source_active,assignee_id,
    state,resolution_due_at,created_at)
    SELECT NEW.kind,NEW.id::text,NEW.shop_order_id,o.store_id,NEW.kind,'Hồ sơ '||NEW.kind||' #'||left(NEW.id::text,8),
      NEW.workflow_status,active,NEW.assignee_id,next_state,NEW.due_at,NEW.created_at FROM order_service.orders o WHERE o.id=NEW.shop_order_id
    ON CONFLICT(kind,source_id) DO UPDATE SET source_status=EXCLUDED.source_status,source_active=EXCLUDED.source_active,
      assignee_id=EXCLUDED.assignee_id,resolution_due_at=CASE WHEN NEW.due_at IS DISTINCT FROM OLD.due_at THEN EXCLUDED.resolution_due_at ELSE work_items.resolution_due_at END,
      state=CASE WHEN NEW.workflow_status IS DISTINCT FROM OLD.workflow_status THEN EXCLUDED.state ELSE work_items.state END;
  RETURN NEW;
END $$;
CREATE TRIGGER sync_case_work_item AFTER INSERT OR UPDATE ON order_service.admin_cases
  FOR EACH ROW EXECUTE FUNCTION order_service.sync_case_work_item();
INSERT INTO order_service.work_items(kind,source_id,shop_order_id,store_id,case_kind,title,source_status,source_active,assignee_id,state,resolution_due_at,created_at)
  SELECT c.kind,c.id::text,c.shop_order_id,o.store_id,c.kind,'Hồ sơ '||c.kind||' #'||left(c.id::text,8),c.workflow_status,
    c.workflow_status NOT IN ('CLOSED','RESOLVED','DECIDED'),c.assignee_id,
    CASE WHEN c.workflow_status IN ('CLOSED','RESOLVED','DECIDED') THEN 'RESOLVED' WHEN c.workflow_status='WAITING_INFORMATION' THEN 'WAITING_RESPONSE'
      WHEN c.workflow_status='AWAITING_APPROVAL' THEN 'AWAITING_APPROVAL' WHEN c.workflow_status='NEW' THEN 'OPEN' ELSE 'IN_PROGRESS' END,c.due_at,c.created_at
  FROM order_service.admin_cases c JOIN order_service.orders o ON o.id=c.shop_order_id;
CREATE INDEX work_queue_filter ON order_service.work_items(kind,assignee_id,state,resolution_due_at) WHERE source_active;
CREATE INDEX work_notifications_recipient ON order_service.work_notifications(recipient_id,created_at DESC);
