-- Existing pending proposals have no trustworthy amount/recipient snapshot and must be resubmitted.
ALTER TABLE order_service.return_exceptions ADD COLUMN approval_snapshot jsonb;
