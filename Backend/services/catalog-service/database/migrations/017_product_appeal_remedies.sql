ALTER TABLE catalog.products ADD COLUMN current_publication_decision_id uuid REFERENCES catalog.product_decisions(id);
ALTER TABLE catalog.product_remedies DROP CONSTRAINT product_remedies_status_check;
ALTER TABLE catalog.product_remedies ADD CONSTRAINT product_remedies_status_check
 CHECK(status IN ('OPEN','SUBMITTED','CONFIRMED','OVERTURNED'));
