ALTER TABLE payment_service.refunds ADD COLUMN succeeded_at timestamptz;
UPDATE payment_service.refunds SET succeeded_at=updated_at WHERE status='SUCCEEDED';
CREATE FUNCTION payment_service.record_refund_success() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status='SUCCEEDED' AND NEW.succeeded_at IS NULL THEN NEW.succeeded_at=now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER record_refund_success BEFORE INSERT OR UPDATE ON payment_service.refunds
  FOR EACH ROW EXECUTE FUNCTION payment_service.record_refund_success();
CREATE INDEX dashboard_payment_time ON payment_service.payment_transactions(verified_at) WHERE status='SUCCEEDED';
CREATE INDEX dashboard_refund_time ON payment_service.refunds(succeeded_at) WHERE status='SUCCEEDED';
