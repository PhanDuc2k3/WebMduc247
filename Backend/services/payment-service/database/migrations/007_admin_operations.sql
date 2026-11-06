ALTER TABLE payment_service.payment_intents ADD COLUMN admin_recheck_requested_at timestamptz;
ALTER TABLE payment_service.refunds ADD COLUMN admin_version integer NOT NULL DEFAULT 1;
ALTER TABLE payment_service.refunds ADD COLUMN admin_recheck_requested_at timestamptz;
CREATE FUNCTION payment_service.refund_admin_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.admin_version=OLD.admin_version+1; RETURN NEW; END $$;
CREATE TRIGGER refund_admin_version BEFORE UPDATE ON payment_service.refunds FOR EACH ROW EXECUTE FUNCTION payment_service.refund_admin_version();
CREATE TABLE payment_service.admin_operations (
 id bigserial PRIMARY KEY,actor_id uuid NOT NULL,request_id uuid NOT NULL,kind text NOT NULL,target_id uuid NOT NULL,
 reason text NOT NULL,read_version bigint NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor_id,request_id)
);
CREATE INDEX payment_admin_lookup ON payment_service.payment_intents(created_at DESC,id DESC);
CREATE INDEX refund_admin_lookup ON payment_service.refunds(created_at DESC,id DESC);
