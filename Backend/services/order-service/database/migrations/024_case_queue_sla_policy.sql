-- Retain explicit/custom deadlines and all existing cases. Replace only the legacy
-- default deadline for a newly created case with the configured per-kind policy.
CREATE FUNCTION order_service.apply_new_case_sla() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE duration_minutes integer;
BEGIN
  IF NEW.created_at=now() AND NEW.due_at=now()+interval '48 hours' THEN
    SELECT resolution_minutes INTO STRICT duration_minutes FROM order_service.work_sla_policies WHERE kind=NEW.kind;
    NEW.due_at=NEW.created_at+make_interval(mins=>duration_minutes);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER apply_new_case_sla BEFORE INSERT ON order_service.admin_cases
  FOR EACH ROW EXECUTE FUNCTION order_service.apply_new_case_sla();
