ALTER TABLE order_service.case_permissions DROP CONSTRAINT case_permissions_permission_check;
ALTER TABLE order_service.case_permissions ADD CONSTRAINT case_permissions_permission_check CHECK(permission IN
  ('exception.request','exception.approve','evidence.supervise','case.decision.approve','case.appeal.review','aftersales.intervene','orders.cancel_blocked'));
ALTER TABLE order_service.order_status_history ADD COLUMN read_version integer;
ALTER TABLE order_service.order_status_history ADD COLUMN result_version integer;
