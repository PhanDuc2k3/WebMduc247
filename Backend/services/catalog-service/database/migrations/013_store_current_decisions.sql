ALTER TABLE catalog.stores ADD COLUMN current_suspension_decision_id uuid REFERENCES catalog.store_decisions(id);
ALTER TABLE catalog.stores ADD COLUMN current_registration_decision_id uuid REFERENCES catalog.store_decisions(id);
UPDATE catalog.stores s SET current_suspension_decision_id=(SELECT d.id FROM catalog.store_decisions d
  WHERE d.store_id=s.id AND d.action='suspend' ORDER BY d.created_at DESC,d.id DESC LIMIT 1) WHERE s.platform_suspended;
UPDATE catalog.stores s SET current_registration_decision_id=(SELECT d.id FROM catalog.store_decisions d
  WHERE d.store_id=s.id AND d.action=s.registration_status ORDER BY d.created_at DESC,d.id DESC LIMIT 1);
